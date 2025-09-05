-- CreateTable
CREATE TABLE "public"."ruc_cache" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "nombreORazonSocial" TEXT NOT NULL,
    "direccion" TEXT,
    "direccionCompleta" TEXT,
    "estado" TEXT,
    "condicion" TEXT,
    "departamento" TEXT,
    "provincia" TEXT,
    "distrito" TEXT,
    "ubigeoSunat" TEXT,
    "nombreComercial" TEXT,
    "actividadEconomica" TEXT,
    "esAgenteRetencion" TEXT,
    "esBuenContribuyente" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ruc_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."representante_legal" (
    "id" TEXT NOT NULL,
    "rucCacheId" TEXT NOT NULL,
    "tipoDocumento" TEXT,
    "numeroDocumento" TEXT,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "fechaDesde" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "representante_legal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ruc_cache_id_key" ON "public"."ruc_cache"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ruc_cache_ruc_key" ON "public"."ruc_cache"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "representante_legal_id_key" ON "public"."representante_legal"("id");

-- AddForeignKey
ALTER TABLE "public"."representante_legal" ADD CONSTRAINT "representante_legal_rucCacheId_fkey" FOREIGN KEY ("rucCacheId") REFERENCES "public"."ruc_cache"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
