-- ============================================
-- AMDA Database Seed Data
-- ============================================
-- Ce fichier contient des données de test pour le développement
-- ⚠️ NE PAS UTILISER EN PRODUCTION

-- ============================================
-- 1. Créer un utilisateur de test
-- ============================================
-- Note: Le password_hash doit être généré avec bcrypt
-- Exemple pour "password123": $2a$10$...
-- Pour générer: bcrypt.hashSync('password123', 10)

INSERT INTO users (id, email, password_hash, plan)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'test@amda.com',
    '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', -- password: test123
    'free'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'premium@amda.com',
    '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', -- password: test123
    'premium'
  )
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. Créer des quotas pour les utilisateurs
-- ============================================
INSERT INTO quotas (user_id, view_once_count, deleted_messages_count, scheduled_statuses_count, reset_date)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    2, -- 2/3 utilisés
    1, -- 1/3 utilisés
    0, -- 0/1 utilisés
    DATE_TRUNC('month', NOW())::DATE + INTERVAL '1 month'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    0, -- Premium: illimité
    0, -- Premium: illimité
    0, -- Premium: illimité
    DATE_TRUNC('month', NOW())::DATE + INTERVAL '1 month'
  )
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. Créer une session WhatsApp de test
-- ============================================
INSERT INTO whatsapp_sessions (user_id, session_id, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'test-session-001',
    'disconnected'
  )
ON CONFLICT (session_id) DO NOTHING;

-- ============================================
-- 4. Créer des captures View Once de test
-- ============================================
INSERT INTO view_once_captures (user_id, sender_id, sender_name, media_url, media_type, captured_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    '226XXXXXXXX',
    'John Doe',
    'https://example.com/media/image1.jpg',
    'image',
    NOW() - INTERVAL '3 hours'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '226YYYYYYYY',
    'Jane Smith',
    'https://example.com/media/video1.mp4',
    'video',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. Créer des messages supprimés de test
-- ============================================
INSERT INTO deleted_messages (user_id, sender_id, sender_name, message_id, content, sent_at, deleted_at, delay_seconds)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    '226XXXXXXXX',
    'John Doe',
    'msg-001',
    'Ce message a été supprimé par l''expéditeur...',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes',
    120 -- 2 minutes de délai
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. Créer une config répondeur de test
-- ============================================
INSERT INTO autoresponder_config (user_id, mode, message, enabled, auto_activate_offline)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'offline',
    '🤖 Répondeur automatique

Bonjour ! Je ne suis pas disponible pour le moment.
Laissez-moi un message, je vous répondrai dès que possible.

Merci de votre compréhension !',
    TRUE,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'busy',
    '⏰ Mode Occupé

Je suis actuellement occupé(e) et ne peux pas répondre.
Je reviendrai vers vous dès que possible.

Merci de patienter !',
    FALSE,
    FALSE
  )
ON CONFLICT (user_id, mode) DO NOTHING;

-- ============================================
-- 7. Créer des status likés de test
-- ============================================
INSERT INTO status_likes (user_id, contact_id, contact_name, status_id, emoji_used, liked_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    '226XXXXXXXX',
    'John Doe',
    'status-001',
    '❤️',
    NOW() - INTERVAL '5 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '226YYYYYYYY',
    'Jane Smith',
    'status-002',
    '😍',
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. Créer une config auto-like Premium (exemple)
-- ============================================
INSERT INTO status_auto_like_config (user_id, contact_id, contact_name, enabled, emoji)
VALUES 
  (
    '00000000-0000-0000-0000-000000000002',
    '226XXXXXXXX',
    'John Doe',
    TRUE,
    '❤️'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '226YYYYYYYY',
    'Jane Smith',
    TRUE,
    '🔥'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '226ZZZZZZZZ',
    'Boss',
    FALSE, -- Désactivé pour le boss
    '👍'
  )
ON CONFLICT (user_id, contact_id) DO NOTHING;

-- ============================================
-- 9. Créer des contacts répondeur Premium
-- ============================================
INSERT INTO autoresponder_contacts (user_id, contact_id, contact_name, enabled, custom_message)
VALUES 
  (
    '00000000-0000-0000-0000-000000000002',
    '226XXXXXXXX',
    'John Doe',
    TRUE,
    NULL -- Message par défaut
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '226YYYYYYYY',
    'Jane Smith',
    TRUE,
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '226ZZZZZZZZ',
    'Boss',
    FALSE, -- Pas de réponse auto pour le boss
    NULL
  )
ON CONFLICT (user_id, contact_id) DO NOTHING;

-- ============================================
-- 10. Créer un status programmé de test
-- ============================================
INSERT INTO scheduled_statuses (user_id, media_url, caption, scheduled_at, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'https://example.com/media/status.jpg',
    'Mon status programmé ! 🎉',
    NOW() + INTERVAL '2 days',
    'pending'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- Notes
-- ============================================
-- Les password_hash sont des exemples
-- En production, générer avec: bcrypt.hashSync(password, 10)
-- Les UUIDs sont des exemples pour les tests
-- Adapter selon vos besoins de développement

