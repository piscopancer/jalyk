-- Расширения БД, нужные Jalyk. Выполняется автоматически при первом создании
-- базы (пустого тома). pgvector — семантический поиск по эмбеддингам,
-- pg_trgm — fuzzy-поиск по нескольким полям с устойчивостью к опечаткам.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
