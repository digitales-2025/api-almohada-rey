export interface ResponseApiRuc {
  ruc: string;
  nombreORazonSocial: string;
  tipoContribuyente?: string;
  nombreComercial?: string;
  fechaInscripcion?: string;
  fechaInicioActividades?: string;
  estado?: string;
  condicion?: string;
  domicilioFiscal?: string;
  sistemaEmisionComprobante?: string;
  actividadComercioExterior?: string;
  sistemaContabilidad?: string;
  actividadPrincipal?: string;
  actividadSecundaria1?: string;
  actividadSecundaria2?: string;
  comprobantesAutorizados?: string;
  sistemaEmisionElectronica?: string;
  emisorElectronicoDesde?: string;
  comprobantesElectronicos?: string;
  afiliadoPLEDesde?: string;
  padrones?: string;
  representantes?: ResponseApiRucRepresentante[];
}

export interface ResponseApiRucRepresentante {
  tipoDocumento?: string;
  numeroDocumento?: string;
  nombre: string;
  cargo?: string;
  fechaDesde?: string;
}

export interface SunatQueryResponse {
  razonSocial?: string;
  tipoContribuyente?: string;
  nombreComercial?: string;
  fechaInscripcion?: string;
  fechaInicioActividades?: string;
  estado?: string;
  condicion?: string;
  domicilioFiscal?: string;
  sistemaEmisionComprobante?: string;
  actividadComercioExterior?: string;
  sistemaContabilidad?: string;
  actividadPrincipal?: string;
  actividadSecundaria1?: string;
  actividadSecundaria2?: string;
  comprobantesAutorizados?: string;
  sistemaEmisionElectronica?: string;
  emisorElectronicoDesde?: string;
  comprobantesElectronicos?: string;
  afiliadoPLEDesde?: string;
  padrones?: string;
}

export interface ApiPeruRucResponse {
  data: {
    ruc: string;
    nombre_o_razon_social: string;
    direccion: string;
    direccion_completa: string;
    estado: string;
    condicion: string;
    departamento: string;
    provincia: string;
    distrito: string;
    ubigeo_sunat: string;
    ubigeo: string[];
    es_agente_de_retencion: string;
    es_buen_contribuyente: string;
  };
}

export interface ApiPeruRucRepresentantesResponse {
  data: {
    tipo_de_documento: string;
    numero_de_documento: string;
    nombre: string;
    cargo: string;
    fecha_desde: string;
  }[];
}
