/*
  Warnings:

  - You are about to drop the column `actividadEconomica` on the `ruc_cache` table. All the data in the column will be lost.
  - You are about to drop the column `departamento` on the `ruc_cache` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `ruc_cache` table. All the data in the column will be lost.
  - You are about to drop the column `direccionCompleta` on the `ruc_cache` table. All the data in the column will be lost.
  - You are about to drop the column `distrito` on the `ruc_cache` table. All the data in the column will be lost.
  - You are about to drop the column `esAgenteRetencion` on the `ruc_cache` table. All the data in the column will be lost.
  - You are about to drop the column `esBuenContribuyente` on the `ruc_cache` table. All the data in the column will be lost.
  - You are about to drop the column `provincia` on the `ruc_cache` table. All the data in the column will be lost.
  - You are about to drop the column `ubigeoSunat` on the `ruc_cache` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ruc_cache" DROP COLUMN "actividadEconomica",
DROP COLUMN "departamento",
DROP COLUMN "direccion",
DROP COLUMN "direccionCompleta",
DROP COLUMN "distrito",
DROP COLUMN "esAgenteRetencion",
DROP COLUMN "esBuenContribuyente",
DROP COLUMN "provincia",
DROP COLUMN "ubigeoSunat",
ADD COLUMN     "actividadComercioExterior" TEXT,
ADD COLUMN     "actividadPrincipal" TEXT,
ADD COLUMN     "actividadSecundaria1" TEXT,
ADD COLUMN     "actividadSecundaria2" TEXT,
ADD COLUMN     "afiliadoPLEDesde" TEXT,
ADD COLUMN     "comprobantesAutorizados" TEXT,
ADD COLUMN     "comprobantesElectronicos" TEXT,
ADD COLUMN     "domicilioFiscal" TEXT,
ADD COLUMN     "emisorElectronicoDesde" TEXT,
ADD COLUMN     "fechaInicioActividades" TEXT,
ADD COLUMN     "fechaInscripcion" TEXT,
ADD COLUMN     "padrones" TEXT,
ADD COLUMN     "sistemaContabilidad" TEXT,
ADD COLUMN     "sistemaEmisionComprobante" TEXT,
ADD COLUMN     "sistemaEmisionElectronica" TEXT,
ADD COLUMN     "tipoContribuyente" TEXT;
