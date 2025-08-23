-- CreateTable
CREATE TABLE "public"."dni_cache" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dni_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dni_cache_id_key" ON "public"."dni_cache"("id");

-- CreateIndex
CREATE UNIQUE INDEX "dni_cache_dni_key" ON "public"."dni_cache"("dni");
