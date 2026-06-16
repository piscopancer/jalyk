/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - Made the column `ownerId` on table `Project` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `authProvider` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Owner', 'Editor', 'Viewer');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('Google', 'GitHub');

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
ADD COLUMN     "authProvider" "AuthProvider" NOT NULL,
ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "UserProjectRole" (
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,

    CONSTRAINT "UserProjectRole_pkey" PRIMARY KEY ("userId","projectId")
);

-- AddForeignKey
ALTER TABLE "UserProjectRole" ADD CONSTRAINT "UserProjectRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectRole" ADD CONSTRAINT "UserProjectRole_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
