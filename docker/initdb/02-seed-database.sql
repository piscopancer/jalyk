-- Отдельная база под сид/тестовые среды apps/web. Её схема пересоздаётся
-- начисто при каждом старте сид-профиля, поэтому держим её отдельно от рабочей
-- базы jalyk, чтобы не затирать данные обычной разработки.
CREATE DATABASE jalyk_seed;
\connect jalyk_seed
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
