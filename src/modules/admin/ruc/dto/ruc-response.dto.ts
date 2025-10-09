import { ApiProperty } from '@nestjs/swagger';

export class RepresentanteLegalDto {
  @ApiProperty({
    description: 'Tipo de documento del representante',
    example: 'DNI',
    required: false,
  })
  tipoDocumento?: string;

  @ApiProperty({
    description: 'Número de documento del representante',
    example: '29392418',
    required: false,
  })
  numeroDocumento?: string;

  @ApiProperty({
    description: 'Nombre completo del representante',
    example: 'TOHALINO RIVEROS PERCY FERNANDO',
  })
  nombre: string;

  @ApiProperty({
    description: 'Cargo del representante en la empresa',
    example: 'PRESIDENTE',
    required: false,
  })
  cargo?: string;

  @ApiProperty({
    description: 'Fecha desde que ocupa el cargo',
    example: '31/07/2010',
    required: false,
  })
  fechaDesde?: string;
}

export class RucResponseDto {
  @ApiProperty({
    description: 'Número de RUC',
    example: '20454777621',
  })
  ruc: string;

  @ApiProperty({
    description: 'Nombre o razón social de la empresa',
    example:
      'ASOCIACION CIVIL DE INVESTIGACION PARA EL DESARROLLO Y LA EMPRESA - ACIDE',
  })
  nombreORazonSocial: string;

  @ApiProperty({
    description: 'Tipo de contribuyente',
    example: 'ASOCIACION',
    required: false,
  })
  tipoContribuyente?: string;

  @ApiProperty({
    description: 'Nombre comercial',
    example: '-',
    required: false,
  })
  nombreComercial?: string;

  @ApiProperty({
    description: 'Fecha de inscripción',
    example: '23/08/2012',
    required: false,
  })
  fechaInscripcion?: string;

  @ApiProperty({
    description: 'Fecha de inicio de actividades',
    example: '23/08/2012',
    required: false,
  })
  fechaInicioActividades?: string;

  @ApiProperty({
    description: 'Estado del contribuyente',
    example: 'ACTIVO',
    required: false,
  })
  estado?: string;

  @ApiProperty({
    description: 'Condición del contribuyente',
    example: 'HABIDO',
    required: false,
  })
  condicion?: string;

  @ApiProperty({
    description: 'Domicilio fiscal',
    example:
      'CAL.PAZ SOLDAN NRO. 815 (3 CDRAS ARRIBA DE AV. PROGRESO) AREQUIPA - AREQUIPA - MIRAFLORES',
    required: false,
  })
  domicilioFiscal?: string;

  @ApiProperty({
    description: 'Sistema de emisión de comprobante',
    example: 'MANUAL',
    required: false,
  })
  sistemaEmisionComprobante?: string;

  @ApiProperty({
    description: 'Actividad de comercio exterior',
    example: 'IMPORTADOR/EXPORTADOR',
    required: false,
  })
  actividadComercioExterior?: string;

  @ApiProperty({
    description: 'Sistema de contabilidad',
    example: 'MANUAL',
    required: false,
  })
  sistemaContabilidad?: string;

  @ApiProperty({
    description: 'Actividad económica principal',
    example: 'ACTIVIDADES DE CONSULTORÍA DE GESTIÓN',
    required: false,
  })
  actividadPrincipal?: string;

  @ApiProperty({
    description: 'Actividad económica secundaria 1',
    example: 'ACTIVIDADES DE INVESTIGACIÓN',
    required: false,
  })
  actividadSecundaria1?: string;

  @ApiProperty({
    description: 'Actividad económica secundaria 2',
    example: 'ACTIVIDADES DE APOYO A LA ENSEÑANZA',
    required: false,
  })
  actividadSecundaria2?: string;

  @ApiProperty({
    description: 'Comprobantes autorizados',
    example: 'FACTURA\nBOLETA DE VENTA\nNOTA DE CREDITO',
    required: false,
  })
  comprobantesAutorizados?: string;

  @ApiProperty({
    description: 'Sistema de emisión electrónica',
    example: 'FACTURA PORTAL DESDE 31/12/2021\nBOLETA PORTAL DESDE 23/11/2022',
    required: false,
  })
  sistemaEmisionElectronica?: string;

  @ApiProperty({
    description: 'Emisor electrónico desde',
    example: '31/12/2021',
    required: false,
  })
  emisorElectronicoDesde?: string;

  @ApiProperty({
    description: 'Comprobantes electrónicos',
    example: 'FACTURA (desde 31/12/2021),BOLETA (desde 23/11/2022)',
    required: false,
  })
  comprobantesElectronicos?: string;

  @ApiProperty({
    description: 'Afiliado al PLE desde',
    example: '-',
    required: false,
  })
  afiliadoPLEDesde?: string;

  @ApiProperty({
    description: 'Padrones',
    example: 'NINGUNO',
    required: false,
  })
  padrones?: string;

  @ApiProperty({
    description: 'Lista de representantes legales',
    type: [RepresentanteLegalDto],
    required: false,
  })
  representantes?: RepresentanteLegalDto[];
}
