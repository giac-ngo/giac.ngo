# Hướng dẫn Phân Quyền Đa Không Gian (Multi-Tenant RBAC)

Hệ thống Giác Ngộ VN sử dụng cơ chế Phân Quyền Dựa Trên Vai Trò (Role-Based Access Control - RBAC) được thiết kế đặc thù cho kiến trúc Multi-Tenant. Dưới đây là chi tiết về cách hoạt động của hệ thống phân quyền này.

## 1. Khái niệm Cốt lõi

- **System Role (Quyền Hệ thống)**: Là các Quyền có sẵn của hệ thống (ví dụ: `User`, `Global Admin`). Các quyền này có trường `space_id IS NULL` trong cơ sở dữ liệu. Không ai có quyền sửa hoặc xóa các Quyền này ngoại trừ Global Admin.
- **Space Role (Quyền Không Gian)**: Là các Quyền do chủ Không Gian (Space Owner) tự tạo ra để phân cấp quản lý trong nội bộ Không Gian của mình. Các quyền này có `space_id` trỏ về ID của Không Gian đó.
- **Global Admin (Quản trị viên toàn hệ thống)**: Là người có quyền `roles` nhưng KHÔNG thuộc (hoặc không bị giới hạn bởi) bất kỳ một Space nào. Truy cập thông qua root domain `/admin`.
- **Space Admin / Space Manager**: Là người được cấp quyền quản trị (như `ai`, `users`, `roles`) nhưng bị giới hạn bên trong Không Gian của họ. Truy cập thông qua `/:slug/admin`.

## 2. Kiến trúc Cơ Sở Dữ Liệu

Bảng `roles` lưu trữ tất cả các Quyền.
- Cột `space_id` (Nullable): Xác định Quyền này thuộc về Không Gian nào. Nếu `NULL`, đó là Quyền Hệ thống.
- **Ràng buộc Duy nhất (Unique Constraint)**: Đã được sửa đổi từ `UNIQUE(name)` thành `UNIQUE (name, COALESCE(space_id, 0))` để cho phép các Không Gian khác nhau có thể tạo các Quyền trùng tên nhau (ví dụ: Space A và Space B đều có thể tạo role tên là "Quản lý AI").

Bảng `user_roles` lưu trữ mối quan hệ n-n giữa Người dùng và Quyền. Lưu ý rằng khi thêm quyền cho user, cần đảm bảo ID của quyền đó thuộc về hệ thống hoặc thuộc về Không Gian mà user đó đang tham gia.

Bảng `space_members` quản lý danh sách người dùng của từng Không Gian và trạng thái hoạt động của họ (`is_active`).

## 3. Kiến trúc Frontend (`isGlobalAdmin` và Dynamic Roles)

Vì hệ thống sử dụng Dynamic Roles (Quyền Động có thể tạo ra vô hạn), logic ẩn/hiện nút Quản trị và kiểm tra truy cập Router được thực hiện thông qua việc kiểm tra mảng `user.roleIds`:
- Mọi user đăng ký mới đều có `roleIds = []` (không có quyền quản trị).
- **Nút "Quản trị" trên giao diện**: Chỉ hiển thị nếu `user.roleIds.length > 0` (có ít nhất 1 role) HOẶC nếu user là Chủ không gian (`currentSpace.userId === user.id`).
- **Chặn truy cập URL (`/:slug/admin`)**: Nếu user cố tình gõ link quản trị mà mảng `roleIds` trống rỗng và họ không phải chủ không gian, hệ thống tự động đẩy về trang trước đó bằng `navigate(-1)`.

Ngoài ra, cơ chế xác thực Quản trị viên Toàn hệ thống được quyết định bởi Component `AdminPage.tsx` thông qua URL Context:
- Nếu URL là `/admin`: `isGlobalAdmin = true` (Kèm theo kiểm tra quyền backend).
- Nếu URL là `/:slug/admin`: `isGlobalAdmin = false`, giới hạn phạm vi trong `currentSpace`.

Prop `isGlobalAdmin` và `space` (contextSpace) được truyền rải xuống tất cả các Component con: `SpaceManagement`, `RoleManagement`, `UserManagement`, `AiManagement` để:
1. **Lọc Dữ liệu**: Chỉ hiển thị dữ liệu (Users, Roles, AI Configs) thuộc về `contextSpace` hiện tại.
2. **Khóa Chức năng**: Ẩn các nút "Xóa Không gian", "Chỉnh sửa quyền hệ thống" đối với Space Manager.

## 4. Kiến trúc Backend

Các API quản trị đều kiểm tra logic `space_id`.

- `roleController.ts`: Khi lấy danh sách Quyền (`getAllRoles`), nếu có `spaceId` truyền lên, hệ thống sẽ trả về **Quyền hệ thống (Read-only)** + **Quyền của riêng Space đó (Editable)**. Nếu không có `spaceId` (Global Admin), hệ thống sẽ trả về danh sách Quyền Hệ thống.
- `aiConfigController.ts`: Khi duyệt quyền quản lý AI, backend dùng hàm `getUserManagedSpaceIds(req.user.id)` gộp chung quyền lợi của **Space Owner** và **Space Member có quyền AI** để xác định người này có được phép thao tác trên AI Config hay không.
- `spaceMember.model.ts`: Khi get members, backend tự động gọi `enrichUserWithPermissions` để map đầy đủ danh sách `roleIds` của từng thành viên, phục vụ cho form chỉnh sửa Quyền ở giao diện.

## 5. Luồng Cấp Quyền Đăng Ký Mới / Google Auth

Khi một User mới đăng ký (qua Email hoặc Google OAuth), hệ thống **không cấp bất kỳ quyền mặc định nào**. 
Trường `roleIds` sẽ được đặt là mảng rỗng `[]`:
- Thay vì gán cứng `role_id = [3]` hay phải tìm kiếm động `SELECT id FROM roles WHERE name = 'User'`, việc gán mảng rỗng giúp hệ thống hoàn toàn loại bỏ rủi ro `Foreign Key Constraint` khi ID của Role bị thay đổi ở các môi trường khác nhau.
- User mới vẫn được vào app và sử dụng tính năng cơ bản, nhưng sẽ bị khóa toàn bộ các Nút và URL quản trị cho đến khi được Admin cấp quyền.
