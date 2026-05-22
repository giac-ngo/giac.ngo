SELECT s.id, s.name, s.slug, (SELECT COUNT(*) FROM space_members WHERE space_id = s.id) as count FROM spaces s WHERE s.slug IN ('thile', 'giac-ngo', 'stillenvc');
