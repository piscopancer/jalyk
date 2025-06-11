/*
  Warnings:

  - Added the required column `type` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column (which you've already done)
ALTER TABLE "Document" ADD COLUMN "type" TEXT;

-- Then update all existing rows to have 'bruh' as the default value
UPDATE "Document" SET "type" = 'bruh';

-- Finally, alter the column to be NOT NULL
ALTER TABLE "Document" ALTER COLUMN "type" SET NOT NULL;