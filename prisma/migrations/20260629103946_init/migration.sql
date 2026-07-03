-- CreateTable
CREATE TABLE "Audience" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "columns" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AudienceRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "audienceId" INTEGER NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "AudienceRow_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "waId" TEXT NOT NULL,
    "contact" TEXT,
    "contactName" TEXT,
    "direction" TEXT NOT NULL,
    "text" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "timestamp" INTEGER
);
