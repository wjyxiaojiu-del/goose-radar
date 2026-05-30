-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abilities" TEXT NOT NULL,
    "weights" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Intern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "major" TEXT NOT NULL,
    "entryDate" DATETIME NOT NULL,
    "phase" TEXT NOT NULL DEFAULT '入门期',
    "positionId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "potentialScore" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "riskLevel" TEXT NOT NULL DEFAULT '低',
    "potentialType" TEXT NOT NULL DEFAULT '',
    "taskCompletionRate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Intern_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Intern_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "content" TEXT NOT NULL,
    "aiSummary" TEXT NOT NULL DEFAULT '',
    "emotionSignal" TEXT NOT NULL DEFAULT '中性',
    "difficulties" TEXT NOT NULL DEFAULT '',
    "needsHelp" BOOLEAN NOT NULL DEFAULT false,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyReport_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MentorFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "performance" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "strengths" TEXT NOT NULL DEFAULT '',
    "concerns" TEXT NOT NULL DEFAULT '',
    "needsHR" BOOLEAN NOT NULL DEFAULT false,
    "isSpecific" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorFeedback_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MentorFeedback_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "weekStart" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AbilityScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbilityScore_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "RiskAlert_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoreHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "potentialScore" INTEGER NOT NULL,
    "taskCompletionRate" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreHistory_internId_fkey" FOREIGN KEY ("internId") REFERENCES "Intern" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
