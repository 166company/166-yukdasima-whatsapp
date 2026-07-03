-- CreateTable
CREATE TABLE "Audience" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "columns" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceRow" (
    "id" SERIAL NOT NULL,
    "audienceId" INTEGER NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "AudienceRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "waId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "customName" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("waId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "waId" TEXT NOT NULL,
    "contact" TEXT,
    "contactName" TEXT,
    "direction" TEXT NOT NULL,
    "text" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "timestamp" INTEGER,
    "metadata" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "AudienceRow" ADD CONSTRAINT "AudienceRow_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
