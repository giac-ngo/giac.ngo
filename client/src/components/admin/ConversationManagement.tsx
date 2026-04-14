// client/src/components/admin/ConversationManagement.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Conversation, AIConfig, User, Space } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';
import { useEscapeKey } from '../../hooks/useEscapeKey';

const ITEMS_PER_PAGE = 10;

interface ConversationManagementProps {
    user: User;
    language: 'vi' | 'en';
}

const translations = {
    vi: {
        title: 'Quản lý Hội thoại Người dùng',
        loading: 'Đang tải danh sách hội thoại...',
        user: 'Người dùng',
        startContent: 'Nội dung bắt đầu',
        date: 'Ngày',
        action: 'Hành động',
        viewAndTrain: 'Duyệt & Huấn luyện',
        showing: 'Hiển thị',
        to: 'tới',
        of: 'trên',
        prev: 'Trước',
        next: 'Sau',
        noConversations: 'Không có hội thoại nào.',
        conversationContent: 'Nội dung hội thoại',
        trainPair: 'Huấn luyện cặp này',
        trainingPair: 'Đang huấn luyện...',
        trainedPair: 'Đã huấn luyện',
        untrainPair: 'Hủy huấn luyện cặp này',
        untrainingPair: 'Đang hủy...',
        trainedBadge: 'Đã huấn luyện',
        trainRequestSent: 'Đã thêm cặp Hỏi-Đáp vào dữ liệu huấn luyện cho AI: {name}.',
        trainRequestFailed: 'Thêm cặp Hỏi-Đáp thất bại: {error}',
        untrainSuccess: 'Đã hủy huấn luyện cặp Hỏi-Đáp.',
        untrainError: 'Hủy huấn luyện thất bại: {error}',
        cancel: 'Đóng',
        aiName: 'Tên AI',
        addToSocialFeed: 'Thêm vào Social Feed',
        selectSpace: 'Chọn Không gian để đăng',
        shareTitle: 'Chia sẻ lên cộng đồng',
        shareThoughts: 'Thêm suy nghĩ của bạn...',
        sharePost: 'Chia sẻ',
        sharePosting: 'Đang đăng...',
        shareCancel: 'Hủy',
        shareSuccess: 'Đã chia sẻ lên cộng đồng! 🎉',
        shareFailed: 'Chia sẻ thất bại.',
        shareNoSpace: 'Vui lòng chọn Không gian để đăng bài.',
        filterByUser: 'Lọc theo người dùng',
        filterByAi: 'Lọc theo AI',
        allUsers: 'Tất cả người dùng',
        allAis: 'Tất cả AI',
        checkTrainedError: 'Không thể kiểm tra các cặp đã huấn luyện.',
        aiThought: 'Suy nghĩ của AI',
        editableAnswer: 'Câu trả lời của AI (có thể chỉnh sửa)',
    },
    en: {
        title: 'User Conversation Management',
        loading: 'Loading conversations...',
        user: 'User',
        startContent: 'Starting Content',
        date: 'Date',
        action: 'Action',
        viewAndTrain: 'View & Train',
        showing: 'Showing',
        to: 'to',
        of: 'of',
        prev: 'Previous',
        next: 'Next',
        noConversations: 'No conversations found.',
        conversationContent: 'Conversation Content',
        trainPair: 'Train this pair',
        trainingPair: 'Training...',
        trainedPair: 'Trained',
        untrainPair: 'Untrain this pair',
        untrainingPair: 'Untraining...',
        trainedBadge: 'Trained',
        trainRequestSent: 'Added Q&A pair to training data for AI: {name}.',
        trainRequestFailed: 'Failed to add Q&A pair: {error}',
        untrainSuccess: 'Removed Q&A pair from training data.',
        untrainError: 'Failed to untrain Q&A pair: {error}',
        cancel: 'Close',
        aiName: 'AI Name',
        addToSocialFeed: 'Add to Social Feed',
        selectSpace: 'Select Space to post',
        shareTitle: 'Share to Community',
        shareThoughts: 'Add your thoughts...',
        sharePost: 'Share',
        sharePosting: 'Posting...',
        shareCancel: 'Cancel',
        shareSuccess: 'Shared to community! 🎉',
        shareFailed: 'Share failed.',
        shareNoSpace: 'Please select a Space to post.',
        filterByUser: 'Filter by user',
        filterByAi: 'Filter by AI',
        allUsers: 'All Users',
        allAis: 'All AIs',
        checkTrainedError: 'Could not check for already trained pairs.',
        aiThought: 'AI Thought',
        editableAnswer: 'AI Answer (Editable)',
    }
};

type ShareModalState = {
    conversation: Conversation;
    comment: string;
    submitting: boolean;
    selectedSpaceId: number | null;
};

export const ConversationManagement: React.FC<ConversationManagementProps> = ({ user, language }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [userFilter, setUserFilter] = useState<string>('');
    const [aiFilter, setAiFilter] = useState<string>('');
    const [spaceIdFilter, setSpaceIdFilter] = useState<string>(() => {
        if (user.permissions?.includes('roles')) return ''; // Admin sees all by default
        return '';
    });
    const [allSpaces, setAllSpaces] = useState<Space[]>([]);
    const [shareModal, setShareModal] = useState<ShareModalState | null>(null);
    const { showToast } = useToast();
    const t = translations[language];
    useEscapeKey(() => {
        if (shareModal && !shareModal.submitting) setShareModal(null);
        else setIsModalOpen(false);
    }, isModalOpen || !!shareModal);

    const [trainingPairIndex, setTrainingPairIndex] = useState<number | null>(null);
    const [successfullyTrainedIndices, setSuccessfullyTrainedIndices] = useState<Set<number>>(new Set());
    const [trainedPairsMap, setTrainedPairsMap] = useState<Map<number, Set<string>>>(new Map());
    const [editableAnswers, setEditableAnswers] = useState<Record<number, string>>({});

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [convos, ais, spaces] = await Promise.all([
                    apiService.getAllConversations(user),
                    apiService.getManageableAiConfigs(user),
                    apiService.getSpaces()
                ]);
                setConversations(convos);
                setAiConfigs(ais);
                setAllSpaces(spaces || []);

                // Set default space for regular users
                if (!user.permissions?.includes('roles') && spaces && spaces.length > 0) {
                    const userSpace = spaces.find(s => s.userId === user.id);
                    if (userSpace) {
                        setSpaceIdFilter(String(userSpace.id));
                    }
                }

                const newTrainedPairsMap = new Map<number, Set<string>>();
                const trainingDataPromises = ais
                    .filter(ai => typeof ai.id === 'number')
                    .map(async (ai) => {
                        try {
                            const trainingData = await apiService.getTrainingDataForAI(ai.id as number);
                            const qaData = trainingData.filter(d => d.type === 'qa');
                            const existingPairs = new Set(qaData.map(d => `${d.question?.trim() || ''}|||${d.answer?.trim() || ''}`));
                            if (existingPairs.size > 0) {
                                newTrainedPairsMap.set(ai.id as number, existingPairs);
                            }
                        } catch (e) {
                            console.error(`Could not fetch training data for AI ${ai.id}`, e);
                        }
                    });

                await Promise.all(trainingDataPromises);
                setTrainedPairsMap(newTrainedPairsMap);

            } catch (error) {
                console.error("Lỗi khi tải dữ liệu:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const uniqueUsers = useMemo(() => Array.from(new Set(conversations.map(c => c.userName))).sort(), [conversations]);
    const uniqueAis = useMemo(() => Array.from(new Set(conversations.map(c => c.aiName).filter(Boolean) as string[])).sort(), [conversations]);

    const manageableSpaces = useMemo(() => {
        if (user.permissions?.includes('roles')) {
            return allSpaces; // Admins can see all spaces
        }
        return allSpaces.filter(space => space.userId === user.id);
    }, [allSpaces, user]);

    const filteredConversations = useMemo(() => {
        return conversations.filter(conv => {
            const userMatch = !userFilter || conv.userName === userFilter;
            const aiMatch = !aiFilter || conv.aiName === aiFilter;

            // Space filter: filter by AI's space
            let spaceMatch = true;
            if (spaceIdFilter) {
                const aiConfig = aiConfigs.find(ai => ai.id === conv.aiConfigId);
                spaceMatch = aiConfig ? String(aiConfig.spaceId) === spaceIdFilter : false;
            }

            return userMatch && aiMatch && spaceMatch;
        });
    }, [conversations, userFilter, aiFilter, spaceIdFilter, aiConfigs]);

    const totalPages = Math.ceil(filteredConversations.length / ITEMS_PER_PAGE);
    const paginatedConversations = filteredConversations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleOpenModal = async (conv: Conversation) => {
        setSelectedConversation(conv);
        setTrainingPairIndex(null);

        // Initialize editable answers state for the modal
        const initialAnswers: Record<number, string> = {};
        conv.messages.forEach((msg, index) => {
            if (msg.sender === 'ai') {
                initialAnswers[index] = msg.text;
            }
        });
        setEditableAnswers(initialAnswers);

        if (conv.aiConfigId) {
            try {
                const trainedPairs = trainedPairsMap.get(conv.aiConfigId as number);
                const trainedIndices = new Set<number>();

                if (trainedPairs) {
                    conv.messages.forEach((msg, index) => {
                        if (msg.sender === 'ai' && index > 0 && conv.messages[index - 1].sender === 'user') {
                            const question = conv.messages[index - 1].text.trim();
                            const answer = msg.text.trim();
                            const pairKey = `${question}|||${answer}`;
                            if (trainedPairs.has(pairKey)) {
                                trainedIndices.add(index);
                            }
                        }
                    });
                }
                setSuccessfullyTrainedIndices(trainedIndices);

            } catch (error) {
                console.error("Failed to check training status from map", error);
                showToast(t.checkTrainedError, 'error');
                setSuccessfullyTrainedIndices(new Set());
            }
        } else {
            setSuccessfullyTrainedIndices(new Set());
        }

        setIsModalOpen(true);
    };

    const handleToggleTrainPair = async (conversation: Conversation, aiMessageIndex: number) => {
        if (!conversation || typeof conversation.aiConfigId !== 'number' || trainingPairIndex !== null) return;

        const aiToTrain = aiConfigs.find(ai => ai.id === conversation.aiConfigId);
        if (!aiToTrain) {
            showToast(`Không tìm thấy AI '${conversation.aiName || ''}' để huấn luyện.`, 'error');
            return;
        }

        const question = conversation.messages[aiMessageIndex - 1]?.text?.trim();
        const thought = conversation.messages[aiMessageIndex]?.thought;

        if (!question) return;

        const isAlreadyTrained = successfullyTrainedIndices.has(aiMessageIndex);

        setTrainingPairIndex(aiMessageIndex);

        if (isAlreadyTrained) {
            const originalAnswer = conversation.messages[aiMessageIndex]?.text?.trim();
            if (originalAnswer === undefined) { setTrainingPairIndex(null); return; }

            try {
                await apiService.deleteTrainingQaDataSource(Number(aiToTrain.id), question, originalAnswer);
                showToast(t.untrainSuccess, 'success');

                const newTrainedIndices = new Set(successfullyTrainedIndices);
                newTrainedIndices.delete(aiMessageIndex);
                setSuccessfullyTrainedIndices(newTrainedIndices);

                setTrainedPairsMap(prevMap => {
                    const newMap = new Map(prevMap);
                    const pairsForAi = new Set<string>(newMap.get(aiToTrain.id as number) || []);
                    pairsForAi.delete(`${question}|||${originalAnswer}`);
                    newMap.set(aiToTrain.id as number, pairsForAi);
                    return newMap;
                });

                if (newTrainedIndices.size === 0) {
                    await apiService.updateConversationTrainingStatus(conversation.id, false);
                    setConversations(prevConvos =>
                        prevConvos.map(c =>
                            c.id === conversation.id ? { ...c, isTrained: false } : c
                        )
                    );
                }
            } catch (error: any) {
                showToast(t.untrainError.replace('{error}', error.message), 'error');
            } finally {
                setTrainingPairIndex(null);
            }

        } else {
            const editedAnswer = editableAnswers[aiMessageIndex]?.trim();
            if (editedAnswer === undefined) { setTrainingPairIndex(null); return; }

            try {
                await apiService.createTrainingQaDataSource(Number(aiToTrain.id), question, editedAnswer, thought);
                showToast(t.trainRequestSent.replace('{name}', aiToTrain.name), 'success');

                await apiService.updateConversationTrainingStatus(conversation.id, true);

                setConversations(prevConvos =>
                    prevConvos.map(c =>
                        c.id === conversation.id ? { ...c, isTrained: true } : c
                    )
                );

                setSuccessfullyTrainedIndices(prev => new Set(prev).add(aiMessageIndex));

                setTrainedPairsMap(prevMap => {
                    const newMap = new Map(prevMap);
                    const pairsForAi = new Set<string>(newMap.get(aiToTrain.id as number) || []);
                    pairsForAi.add(`${question}|||${editedAnswer}`); // Use edited answer
                    newMap.set(aiToTrain.id as number, pairsForAi);
                    return newMap;
                });
            } catch (error: any) {
                showToast(t.trainRequestFailed.replace('{error}', error.message), 'error');
            } finally {
                setTrainingPairIndex(null);
            }
        }
    };

    const handleOpenShareModal = (conv: Conversation) => {
        // Find the space for this conversation's AI
        const aiConfig = aiConfigs.find(ai => ai.id === conv.aiConfigId);
        const defaultSpaceId = aiConfig?.spaceId
            ? (typeof aiConfig.spaceId === 'number' ? aiConfig.spaceId : null)
            : (manageableSpaces[0]?.id ? Number(manageableSpaces[0].id) : null);

        setShareModal({
            conversation: conv,
            comment: '',
            submitting: false,
            selectedSpaceId: defaultSpaceId,
        });
    };

    const handleShareSubmit = async () => {
        if (!shareModal) return;
        if (!shareModal.selectedSpaceId) {
            showToast(t.shareNoSpace, 'error');
            return;
        }

        setShareModal(prev => prev ? { ...prev, submitting: true } : null);

        try {
            const conv = shareModal.conversation;
            const aiName = conv.aiName || 'AI';
            const userQuestion = conv.messages.find(m => m.sender === 'user')?.text || '';
            const aiResponse = conv.messages.filter(m => m.sender === 'ai').map(m => m.text).join('\n\n');

            const fd = new FormData();
            fd.append('content', shareModal.comment || ' ');
            fd.append('metadata', JSON.stringify({
                type: 'ai_share',
                aiName,
                userQuestion,
                aiResponse,
            }));

            await apiService.createSocialPost(shareModal.selectedSpaceId, fd);
            showToast(t.shareSuccess, 'success');
            setShareModal(null);
        } catch {
            showToast(t.shareFailed, 'error');
            setShareModal(prev => prev ? { ...prev, submitting: false } : null);
        }
    };

    // Build a short preview text from the conversation
    const getConversationPreview = (conv: Conversation): string => {
        const aiMessages = conv.messages.filter(m => m.sender === 'ai');
        if (aiMessages.length === 0) return conv.messages[0]?.text || '';
        return aiMessages[0].text;
    };

    const renderPagination = () => (
        <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-text-light">
                {t.showing} {filteredConversations.length > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0} {t.to} {Math.min(currentPage * ITEMS_PER_PAGE, filteredConversations.length)} {t.of} {filteredConversations.length}
            </p>
            <div className="flex space-x-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded-md disabled:opacity-50">{t.prev}</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 text-sm border rounded-md disabled:opacity-50">{t.next}</button>
            </div>
        </div>
    );

    if (isLoading) {
        return <div className="p-8 text-center">{t.loading}</div>
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">{t.title}</h1>

            <div className="flex space-x-4 mb-4">
                <div>
                    <label htmlFor="user-filter" className="block text-sm font-medium text-text-light">{t.filterByUser}</label>
                    <select id="user-filter" value={userFilter} onChange={e => setUserFilter(e.target.value)} className="mt-1 block w-full p-2 border border-border-color rounded-md focus:ring-primary focus:border-primary">
                        <option value="">{t.allUsers}</option>
                        {uniqueUsers.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="ai-filter" className="block text-sm font-medium text-text-light">{t.filterByAi}</label>
                    <select id="ai-filter" value={aiFilter} onChange={e => setAiFilter(e.target.value)} className="mt-1 block w-full p-2 border border-border-color rounded-md focus:ring-primary focus:border-primary">
                        <option value="">{t.allAis}</option>
                        {uniqueAis.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                {manageableSpaces.length > 0 && (
                    <div>
                        <label htmlFor="space-filter" className="block text-sm font-medium text-text-light">Lọc theo Không gian</label>
                        <select
                            id="space-filter"
                            value={spaceIdFilter}
                            onChange={e => setSpaceIdFilter(e.target.value)}
                            className="mt-1 block w-full p-2 border border-border-color rounded-md focus:ring-primary focus:border-primary"
                        >
                            {user.permissions?.includes('roles') && <option value="">Tất cả không gian</option>}
                            {manageableSpaces.map(space => (
                                <option key={space.id} value={space.id}>{space.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="bg-background-panel shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-background-light">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.user}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.startContent}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.aiName}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.date}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-light uppercase tracking-wider">{t.action}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-background-panel divide-y divide-border-color">
                        {paginatedConversations.map(conv => (
                            <tr key={conv.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main">{conv.userName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light max-w-sm truncate">{conv.messages[0]?.text || ''}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                                    {conv.aiName}
                                    {conv.isTrained && (
                                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                            {t.trainedBadge}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">{new Date(conv.startTime).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                    <button onClick={() => handleOpenModal(conv)} className="text-primary hover:text-primary-hover">{t.viewAndTrain}</button>
                                    <button onClick={() => handleOpenShareModal(conv)} className="text-indigo-600 hover:text-indigo-800">{t.addToSocialFeed}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredConversations.length === 0 && <p className="text-center py-4 text-text-light">{t.noConversations}</p>}
            </div>
            {renderPagination()}

            {/* Conversation Detail Modal */}
            {isModalOpen && selectedConversation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-background-panel rounded-lg shadow-xl w-full max-w-3xl flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold p-6 border-b border-border-color flex-shrink-0">{t.conversationContent}</h2>
                        <div className="flex-grow p-6 overflow-y-auto">
                            {selectedConversation.messages.map((msg, index) => {
                                const isTrainablePair = msg.sender === 'ai' && index > 0 && selectedConversation.messages[index - 1].sender === 'user';
                                const isTrained = successfullyTrainedIndices.has(index);
                                const isTraining = trainingPairIndex === index;
                                const buttonText = isTraining
                                    ? (isTrained ? t.untrainingPair : t.trainingPair)
                                    : (isTrained ? t.untrainPair : t.trainPair);

                                return (
                                    <div key={msg.id || index} className="group mb-4">
                                        {msg.sender === 'user' ? (
                                            <div className="p-3 rounded-lg bg-blue-50">
                                                <p className="text-sm text-blue-800">
                                                    <strong className="font-semibold">User:</strong> {msg.text}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <label className="block text-xs font-semibold text-green-900 mb-1">{t.editableAnswer}</label>
                                                <textarea
                                                    value={editableAnswers[index] || ''}
                                                    onChange={(e) => setEditableAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                                                    className="w-full p-2 border rounded-md bg-white text-sm text-green-900 focus:ring-primary focus:border-primary"
                                                    rows={Math.max(4, (editableAnswers[index] || '').split('\n').length)}
                                                />
                                            </div>
                                        )}

                                        {msg.sender === 'ai' && msg.thought && (
                                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
                                                <p className="font-semibold">{t.aiThought}:</p>
                                                <p className="italic whitespace-pre-wrap">{msg.thought}</p>
                                            </div>
                                        )}
                                        {isTrainablePair && (
                                            <div className="text-right -mt-2">
                                                <button
                                                    onClick={() => handleToggleTrainPair(selectedConversation, index)}
                                                    disabled={isTraining}
                                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${isTrained
                                                        ? 'bg-red-100 text-red-700 hover:bg-red-200 opacity-100 group-hover:opacity-100'
                                                        : isTraining
                                                            ? 'bg-yellow-100 text-yellow-700 cursor-wait'
                                                            : 'bg-gray-200 text-gray-700 hover:bg-primary-light hover:text-primary opacity-0 group-hover:opacity-100'
                                                        }`}
                                                >
                                                    {buttonText}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <div className="text-right space-x-3 p-6 border-t border-border-color flex-shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-main bg-background-light rounded-md hover:bg-border-color">{t.cancel}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share to Social Feed Modal — giống PracticeSpacePage */}
            {shareModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={() => !shareModal.submitting && setShareModal(null)}
                >
                    <div
                        style={{ background: 'var(--color-background-panel)', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-border-color)' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)', fontFamily: "'EB Garamond', serif" }}>
                                {t.shareTitle}
                            </span>
                            <button onClick={() => setShareModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
                        </div>

                        {/* Space selector (nếu có nhiều space) */}
                        {manageableSpaces.length > 1 && (
                            <div style={{ padding: '0.75rem 1.25rem 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <label style={{ fontSize: 13, color: 'var(--color-text-light)', fontWeight: 600, flexShrink: 0 }}>{t.selectSpace}:</label>
                                <select
                                    value={shareModal.selectedSpaceId ?? ''}
                                    onChange={e => setShareModal(prev => prev ? { ...prev, selectedSpaceId: Number(e.target.value) } : null)}
                                    style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border-color)', background: 'var(--color-background-main)', color: 'var(--color-text-main)', fontSize: 13 }}
                                >
                                    {manageableSpaces.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Post preview card */}
                        <div style={{ margin: '0.75rem 1.25rem', background: 'var(--color-background-main)', borderRadius: 12, border: '1px solid var(--color-border-color)', overflow: 'hidden' }}>
                            {/* User row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 0' }}>
                                {user?.avatarUrl
                                    ? <img src={user.avatarUrl} alt={user.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#7c3d3d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{user?.name?.charAt(0) || '?'}</div>
                                }
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-main)' }}>{user?.name || 'Bạn'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>@{(user?.name || 'user').toLowerCase().replace(/\s/g, '')} · Vừa xong</div>
                                </div>
                            </div>

                            {/* Textarea for thoughts */}
                            <textarea
                                autoFocus
                                value={shareModal.comment}
                                onChange={e => setShareModal(prev => prev ? { ...prev, comment: e.target.value } : null)}
                                placeholder={t.shareThoughts}
                                rows={2}
                                style={{
                                    width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                                    color: 'var(--color-text-main)', fontSize: '0.9rem', resize: 'none', outline: 'none',
                                    fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5
                                }}
                            />

                            {/* AI Quote block */}
                            <div style={{ margin: '0 10px 10px', background: 'rgba(185,148,90,0.12)', border: '1px solid rgba(185,148,90,0.3)', borderRadius: 10, padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, color: 'var(--color-text-light)' }}>☆</span>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary)' }}>
                                        {shareModal.conversation.aiName ? `Agent: ${shareModal.conversation.aiName}` : (language === 'vi' ? 'Phản hồi AI' : 'AI Response')}
                                    </span>
                                </div>
                                {/* User question preview */}
                                {(() => {
                                    const q = shareModal.conversation.messages.find(m => m.sender === 'user')?.text;
                                    return q ? (
                                        <div style={{ fontSize: 12, color: 'var(--color-text-light)', marginBottom: 6, fontStyle: 'italic' }}>
                                            ❝ {q.length > 100 ? q.slice(0, 100) + '…' : q}
                                        </div>
                                    ) : null;
                                })()}
                                <div style={{ fontSize: 13, color: 'var(--color-text-main)', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' } as React.CSSProperties}>
                                    {getConversationPreview(shareModal.conversation)}
                                </div>
                            </div>

                            {/* Preview stats bar */}
                            <div style={{ display: 'flex', gap: 18, padding: '8px 14px 12px', borderTop: '1px solid var(--color-border-color)' }}>
                                {[{ icon: '♡', label: '0' }, { icon: '○', label: '0' }, { icon: '↻', label: '0' }].map((item, i) => (
                                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-light)' }}>
                                        <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '0.75rem 1.25rem 1rem' }}>
                            <button
                                onClick={() => setShareModal(null)}
                                disabled={shareModal.submitting}
                                style={{ padding: '0.55rem 1.2rem', borderRadius: 8, border: 'none', background: 'none', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                            >
                                {t.shareCancel}
                            </button>
                            <button
                                onClick={handleShareSubmit}
                                disabled={shareModal.submitting}
                                style={{ padding: '0.55rem 1.4rem', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: 'var(--color-text-on-primary)', cursor: shareModal.submitting ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.9rem', opacity: shareModal.submitting ? 0.7 : 1 }}
                            >
                                {shareModal.submitting ? t.sharePosting : t.sharePost}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};