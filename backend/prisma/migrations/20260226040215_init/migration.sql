-- CreateTable
CREATE TABLE "CitizenRecord" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "citizenshipNumber" TEXT NOT NULL,
    "citizenshipHash" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "wardNumber" TEXT NOT NULL,
    "address" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "email" TEXT,
    "faceDescriptorFront" JSONB NOT NULL,
    "faceDescriptorLeft" JSONB NOT NULL,
    "faceDescriptorRight" JSONB NOT NULL,
    "faceImageFrontUrl" TEXT,
    "faceImageLeftUrl" TEXT,
    "faceImageRightUrl" TEXT,
    "isVoterEligible" BOOLEAN NOT NULL DEFAULT false,
    "eligibilityReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitizenRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL,
    "result" BOOLEAN NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchAngle" TEXT NOT NULL,
    "livenessResult" BOOLEAN,
    "livenessChallenge" TEXT,
    "proofToken" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "permissions" JSONB NOT NULL,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "citizenId" TEXT,
    "performedBy" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CitizenRecord_citizenshipNumber_key" ON "CitizenRecord"("citizenshipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenRecord_citizenshipHash_key" ON "CitizenRecord"("citizenshipHash");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenRecord_phoneNumber_key" ON "CitizenRecord"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenRecord_phoneHash_key" ON "CitizenRecord"("phoneHash");

-- CreateIndex
CREATE INDEX "CitizenRecord_phoneHash_idx" ON "CitizenRecord"("phoneHash");

-- CreateIndex
CREATE INDEX "CitizenRecord_citizenshipHash_idx" ON "CitizenRecord"("citizenshipHash");

-- CreateIndex
CREATE INDEX "VerificationLog_citizenId_idx" ON "VerificationLog"("citizenId");

-- CreateIndex
CREATE INDEX "VerificationLog_requestedBy_idx" ON "VerificationLog"("requestedBy");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "CitizenRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "CitizenRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
