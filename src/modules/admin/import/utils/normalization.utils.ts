import {
  CustomerDocumentType,
  CustomerMaritalStatus,
  PaymentDetailMethod,
  PaymentDetailStatus,
  ExpenseDocumentType,
} from '@prisma/client';

export class NormalizationUtils {
  static normalizeDocumentType(excelType: string): CustomerDocumentType {
    if (!excelType) return 'DNI';

    const type = excelType.toLowerCase().trim();
    const mapping = {
      dni: 'DNI',
      cedula: 'DNI',
      'cedula de identidad': 'DNI',
      'documento nacional': 'DNI',
      pasaporte: 'PASSPORT',
      passport: 'PASSPORT',
      'pasaporte extranjero': 'PASSPORT',
      'carnet de extranjeria': 'FOREIGNER_CARD',
      'carnet extranjeria': 'FOREIGNER_CARD',
      'foreigner card': 'FOREIGNER_CARD',
      carnet: 'FOREIGNER_CARD',
    };

    return mapping[type] || 'DNI';
  }

  static normalizeDocumentNumber(
    documentNumber: string,
    documentType: CustomerDocumentType,
  ): string {
    // Si no hay documento, generar uno temporal
    if (!documentNumber || documentNumber.trim() === '') {
      return this.generateTemporaryDocumentNumber();
    }

    const cleanNumber = documentNumber.replace(/\D/g, '');

    if (documentType === 'DNI') {
      if (cleanNumber && cleanNumber.length >= 6 && cleanNumber.length < 8) {
        return cleanNumber.padStart(8, '0');
      }
      return cleanNumber || '';
    }

    return documentNumber;
  }

  static generateTemporaryDocumentNumber(): string {
    // Generar número aleatorio de 8 dígitos con prefijo TEMP_
    const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
    return `TEMP_${randomNumber}`;
  }

  static normalizePhone(phone: string): string {
    if (!phone || phone === '-' || phone === '0') return '-';

    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length === 9) {
      return `+51${cleanPhone}`;
    }

    if (cleanPhone.length > 9) {
      return `+${cleanPhone}`;
    }

    return phone;
  }

  static normalizeMaritalStatus(status: string): CustomerMaritalStatus | null {
    if (!status) return null;

    const statusMap = {
      soltero: 'SINGLE',
      soltera: 'SINGLE',
      casado: 'MARRIED',
      casada: 'MARRIED',
      divorciado: 'DIVORCED',
      divorciada: 'DIVORCED',
      viudo: 'WIDOWED',
      viuda: 'WIDOWED',
    };

    return statusMap[status.toLowerCase()] || null;
  }

  static normalizeBlacklist(blacklist: string): boolean {
    if (!blacklist) return false;
    const value = blacklist.toLowerCase().trim();
    return (
      value === 'si' || value === 'sí' || value === 'true' || value === '1'
    );
  }

  static validateRUC(ruc: string): string | null {
    if (!ruc || ruc === '-' || ruc === '0') return null;
    const cleanRUC = ruc.replace(/\D/g, '');
    return cleanRUC.length === 11 ? cleanRUC : null;
  }

  static createGuestsJSON(companion: string, companionDoc: string): any {
    if (!companion || companion === '-' || companion === '0') return null;

    // Crear un array de guests con la estructura correcta
    const guests = [
      {
        name: companion,
        documentId: companionDoc || null,
        documentType: companionDoc ? this.normalizeDocumentType('DNI') : null,
      },
    ];

    return JSON.stringify(guests);
  }

  static parseDateTime(date: string, time: string): Date {
    if (!date || date.trim() === '' || date.trim() === ' ') {
      throw new Error('Fecha requerida');
    }

    // Si la fecha viene como objeto Date convertido a string, extraer la fecha
    if (date.includes('GMT') || date.includes('T')) {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const year = dateObj.getFullYear();
        const dateStr = `${year}-${month}-${day}`;

        if (
          time &&
          time !== 'Sat Dec 30 1899 03:44:34 GMT-0508 (hora estándar de Perú)'
        ) {
          // Si time también es un objeto Date, extraer la hora
          if (time.includes('GMT')) {
            const timeObj = new Date(time);
            if (!isNaN(timeObj.getTime())) {
              const hours = timeObj.getHours().toString().padStart(2, '0');
              const minutes = timeObj.getMinutes().toString().padStart(2, '0');
              const seconds = timeObj.getSeconds().toString().padStart(2, '0');
              return new Date(`${dateStr}T${hours}:${minutes}:${seconds}`);
            }
          }
          return new Date(`${dateStr}T${time}`);
        }

        return new Date(dateStr);
      }
    }

    // Formato original dd/mm/yyyy
    const [day, month, year] = date.split('/');

    // Validar que tenemos todos los componentes de la fecha
    if (!day || !month || !year) {
      throw new Error(`Fecha inválida: ${date}`);
    }

    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    if (time) {
      return new Date(`${dateStr}T${time}`);
    }

    return new Date(dateStr);
  }

  static normalizePaymentMethod(method: string): PaymentDetailMethod {
    if (!method) return 'CASH';

    const methodMap = {
      efectivo: 'CASH',
      cash: 'CASH',
      'tarjeta de credito': 'CREDIT_CARD',
      'credit card': 'CREDIT_CARD',
      'tarjeta de debito': 'DEBIT_CARD',
      'debit card': 'DEBIT_CARD',
      transferencia: 'TRANSFER',
      transfer: 'TRANSFER',
      yape: 'YAPE',
      plin: 'PLIN',
      paypal: 'PAYPAL',
      'izi pay': 'IZI_PAY',
      'pago pendiente': 'PENDING_PAYMENT',
    };

    return methodMap[method.toLowerCase()] || 'CASH';
  }

  static normalizePaymentStatus(status: string): PaymentDetailStatus {
    if (!status) return 'PENDING';

    const statusMap = {
      pagado: 'PAID',
      paid: 'PAID',
      pendiente: 'PENDING',
      pending: 'PENDING',
    };

    return statusMap[status.toLowerCase()] || 'PENDING';
  }

  static normalizePaymentDocumentType(
    excelType: string,
  ): ExpenseDocumentType | null {
    if (!excelType) return null;

    const type = excelType.toLowerCase().trim();
    const mapping = {
      'sin registro': null, // No crear PaymentDetail
      factura: 'INVOICE', // Crear PaymentDetail
      boleta: 'RECEIPT', // Crear PaymentDetail
      recibo: 'RECEIPT', // Crear PaymentDetail
      comprobante: 'RECEIPT', // Crear PaymentDetail
    };

    return mapping[type] || null;
  }

  static calculateNights(checkIn: Date, checkOut: Date): number {
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static generateRandomDateInRange(
    checkIn: Date,
    checkOut: Date,
    format: 'iso' | 'date' = 'iso',
  ): string {
    const start = checkIn.getTime();
    const end = checkOut.getTime();
    const randomTime = start + Math.random() * (end - start);
    const randomDate = new Date(randomTime);

    if (format === 'date') {
      // Retornar solo la fecha en formato yyyy-MM-dd para compatibilidad con el frontend
      return randomDate.toISOString().split('T')[0];
    } else {
      // Retornar ISO completo con hora (comportamiento original)
      return randomDate.toISOString();
    }
  }

  /**
   * Detecta si un valor es un departamento/provincia/ciudad del Perú
   * @param value Valor a verificar
   * @returns Nombre del departamento peruano o null si no es
   */
  static detectPeruvianDepartment(value?: string): string | null {
    if (!value || value.trim() === '') return null;

    const normalized = value.toLowerCase().trim();

    // Mapa de departamentos, provincias y ciudades del Perú a sus departamentos correspondientes
    const peruvianLocations: { [key: string]: string } = {
      // Departamentos
      amazonas: 'Amazonas',
      ancash: 'Ancash',
      apurímac: 'Apurímac',
      apurimac: 'Apurímac',
      arequipa: 'Arequipa',
      ayacucho: 'Ayacucho',
      cajamarca: 'Cajamarca',
      callao: 'Callao',
      cusco: 'Cusco',
      huancavelica: 'Huancavelica',
      huánuco: 'Huánuco',
      huanuco: 'Huánuco',
      ica: 'Ica',
      junín: 'Junín',
      junin: 'Junín',
      'la libertad': 'La Libertad',
      lambayeque: 'Lambayeque',
      lima: 'Lima',
      loreto: 'Loreto',
      'madre de dios': 'Madre de Dios',
      moquegua: 'Moquegua',
      pasco: 'Pasco',
      piura: 'Piura',
      puno: 'Puno',
      'san martín': 'San Martín',
      'san martin': 'San Martín',
      tacna: 'Tacna',
      tumbes: 'Tumbes',

      // Ciudades principales y sus departamentos
      chachapoyas: 'Amazonas',
      bagua: 'Amazonas',
      bongara: 'Amazonas',
      condorcanqui: 'Amazonas',
      luya: 'Amazonas',
      'rodriguez de mendoza': 'Amazonas',
      utcubamba: 'Amazonas',

      huaraz: 'Ancash',
      aija: 'Ancash',
      'antonio raymondi': 'Ancash',
      asunción: 'Ancash',
      bolognesi: 'Ancash',
      carhuaz: 'Ancash',
      'carlos f. fitzcarrald': 'Ancash',
      casma: 'Ancash',
      corongo: 'Ancash',
      huari: 'Ancash',
      huarmey: 'Ancash',
      huaylas: 'Ancash',
      'mariscal luzuriaga': 'Ancash',
      ocros: 'Ancash',
      pallasca: 'Ancash',
      pomabamba: 'Ancash',
      recuay: 'Ancash',
      santa: 'Ancash',
      sihuas: 'Ancash',
      yungay: 'Ancash',

      abancay: 'Apurímac',
      andahuaylas: 'Apurímac',
      antabamba: 'Apurímac',
      aymaraes: 'Apurímac',
      cotabambas: 'Apurímac',
      chincheros: 'Apurímac',
      grau: 'Apurímac',

      camana: 'Arequipa',
      caraveli: 'Arequipa',
      castilla: 'Arequipa',
      caylloma: 'Arequipa',
      condesuyos: 'Arequipa',
      islay: 'Arequipa',
      'la unión': 'Arequipa',

      huamanga: 'Ayacucho',
      cangallo: 'Ayacucho',
      'huanca sancos': 'Ayacucho',
      huanta: 'Ayacucho',
      'la mar': 'Ayacucho',
      lucanas: 'Ayacucho',
      parinacochas: 'Ayacucho',
      'paucar del sara sara': 'Ayacucho',
      sucre: 'Ayacucho',
      'victor fajardo': 'Ayacucho',
      'vilcas huaman': 'Ayacucho',

      cajabamba: 'Cajamarca',
      celendin: 'Cajamarca',
      chota: 'Cajamarca',
      contumaza: 'Cajamarca',
      cutervo: 'Cajamarca',
      hualgayoc: 'Cajamarca',
      jaen: 'Cajamarca',
      'san ignacio': 'Cajamarca',
      'san marcos': 'Cajamarca',
      'san miguel': 'Cajamarca',
      'san pablo': 'Cajamarca',
      'santa cruz': 'Cajamarca',

      trujillo: 'La Libertad',
      ascope: 'La Libertad',
      bolivar: 'La Libertad',
      chepen: 'La Libertad',
      julcan: 'La Libertad',
      otuzco: 'La Libertad',
      pacasmayo: 'La Libertad',
      pataz: 'La Libertad',
      'sanchez carrion': 'La Libertad',
      'santiago de chuco': 'La Libertad',
      'gran chimu': 'La Libertad',
      viru: 'La Libertad',

      chiclayo: 'Lambayeque',
      ferreñafe: 'Lambayeque',

      barranca: 'Lima',
      cajatambo: 'Lima',
      canta: 'Lima',
      cañete: 'Lima',
      huaral: 'Lima',
      huarochiri: 'Lima',
      huaura: 'Lima',
      oyon: 'Lima',
      yauyos: 'Lima',

      maynas: 'Loreto',
      'alto amazonas': 'Loreto',
      'mariscal ramon castilla': 'Loreto',
      requena: 'Loreto',
      ucayali: 'Loreto',
      'datem del marañon': 'Loreto',
      putumayo: 'Loreto',
      iquitos: 'Loreto',

      tambopata: 'Madre de Dios',
      manu: 'Madre de Dios',
      tahuamanu: 'Madre de Dios',
      'puerto maldonado': 'Madre de Dios',

      'mariscal nieto': 'Moquegua',
      'general sanchez cerro': 'Moquegua',
      ilo: 'Moquegua',

      'daniel alcides carrión': 'Pasco',
      oxapampa: 'Pasco',
      ayabaca: 'Piura',
      huancabamba: 'Piura',
      morropon: 'Piura',
      paita: 'Piura',
      sullana: 'Piura',
      talara: 'Piura',
      sechura: 'Piura',

      azangaro: 'Puno',
      carabaya: 'Puno',
      chucuito: 'Puno',
      'el collao': 'Puno',
      huancane: 'Puno',
      lampa: 'Puno',
      melgar: 'Puno',
      moho: 'Puno',
      'san antonio de putina': 'Puno',
      'san roman': 'Puno',
      sandia: 'Puno',
      yunguyo: 'Puno',

      moyobamba: 'San Martín',
      bellavista: 'San Martín',
      'el dorado': 'San Martín',
      huallaga: 'San Martín',
      lamas: 'San Martín',
      'mariscal caceres': 'San Martín',
      picota: 'San Martín',
      tocache: 'San Martín',

      candarave: 'Tacna',
      'jorge basadre': 'Tacna',
      tarata: 'Tacna',
      'contralmirante villar': 'Tumbes',
      zarumilla: 'Tumbes',

      // Provincias específicas mencionadas por el usuario
      chincha: 'Ica',
      'chincha alta': 'Ica',
      'chincha baja': 'Ica',
      nazca: 'Ica',
      nasca: 'Ica',
      palpa: 'Ica',
      pisco: 'Ica',
    };

    return peruvianLocations[normalized] || null;
  }

  /**
   * Normaliza nacionalidades y determina países basado en diferentes criterios
   * @param nationality Valor de nacionalidad del Excel
   * @param documentType Tipo de documento (opcional, para fallback)
   * @returns País normalizado o null si no se puede determinar
   */
  static normalizeNationality(
    nationality?: string,
    documentType?: string,
  ): string | null {
    // Si no hay nacionalidad, usar tipo de documento como fallback
    if (!nationality || nationality.trim() === '') {
      if (documentType === 'DNI') {
        return 'Perú';
      }
      return null;
    }

    const normalized = nationality.toLowerCase().trim();

    // Mapeos directos de nacionalidades comunes (femenino/masculino)
    const nationalityMappings: { [key: string]: string } = {
      // Perú
      peruana: 'Perú',
      peruano: 'Perú',
      perú: 'Perú',
      peru: 'Perú',

      // América Latina
      argentina: 'Argentina',
      argentino: 'Argentina',
      boliviana: 'Bolivia',
      boliviano: 'Bolivia',
      brasileña: 'Brasil',
      brasileño: 'Brasil',
      chilena: 'Chile',
      chileno: 'Chile',
      colombiana: 'Colombia',
      colombiano: 'Colombia',
      ecuatoriana: 'Ecuador',
      ecuatoriano: 'Ecuador',
      paraguaya: 'Paraguay',
      paraguayo: 'Paraguay',
      uruguaya: 'Uruguay',
      uruguayo: 'Uruguay',
      venezolana: 'Venezuela',
      venezolano: 'Venezuela',

      // Centroamérica y Caribe
      mexicana: 'México',
      mexicano: 'México',
      mexico: 'México',
      méxico: 'México',
      panameña: 'Panamá',
      panameño: 'Panamá',
      panama: 'Panamá',
      panamá: 'Panamá',
      costarricense: 'Costa Rica',
      'costa rica': 'Costa Rica',
      nicaragüense: 'Nicaragua',
      nicaragua: 'Nicaragua',
      hondureña: 'Honduras',
      hondureño: 'Honduras',
      honduras: 'Honduras',
      salvadoreña: 'El Salvador',
      salvadoreño: 'El Salvador',
      'el salvador': 'El Salvador',
      guatemalteca: 'Guatemala',
      guatemalteco: 'Guatemala',
      guatemala: 'Guatemala',
      beliceña: 'Belice',
      beliceño: 'Belice',
      belice: 'Belice',
      cubana: 'Cuba',
      cubano: 'Cuba',
      cuba: 'Cuba',
      dominicana: 'República Dominicana',
      dominicano: 'República Dominicana',
      'republica dominicana': 'República Dominicana',
      puertorriqueña: 'Puerto Rico',
      puertorriqueño: 'Puerto Rico',
      'puerto rico': 'Puerto Rico',

      // Norteamérica
      estadounidense: 'Estados Unidos',
      americano: 'Estados Unidos',
      americana: 'Estados Unidos',
      norteamericano: 'Estados Unidos',
      norteamericana: 'Estados Unidos',
      canadiense: 'Canadá',
      canada: 'Canadá',
      canadá: 'Canadá',

      // Europa
      española: 'España',
      español: 'España',
      espana: 'España',
      españa: 'España',
      francesa: 'Francia',
      francés: 'Francia',
      francia: 'Francia',
      italiana: 'Italia',
      italiano: 'Italia',
      italia: 'Italia',
      alemana: 'Alemania',
      alemán: 'Alemania',
      alemania: 'Alemania',
      inglesa: 'Reino Unido',
      inglés: 'Reino Unido',
      ingles: 'Reino Unido',
      británica: 'Reino Unido',
      británico: 'Reino Unido',
      british: 'Reino Unido',
      'reino unido': 'Reino Unido',
      portuguesa: 'Portugal',
      portugués: 'Portugal',
      portugal: 'Portugal',
      holandesa: 'Países Bajos',
      holandés: 'Países Bajos',
      holanda: 'Países Bajos',
      'paises bajos': 'Países Bajos',
      belga: 'Bélgica',
      belgica: 'Bélgica',
      bélgica: 'Bélgica',
      sueca: 'Suecia',
      sueco: 'Suecia',
      suecia: 'Suecia',
      noruega: 'Noruega',
      noruego: 'Noruega',
      danés: 'Dinamarca',
      danesa: 'Dinamarca',
      dinamarca: 'Dinamarca',
      finlandesa: 'Finlandia',
      finlandés: 'Finlandia',
      finlandia: 'Finlandia',
      irlandesa: 'Irlanda',
      irlandés: 'Irlanda',
      irlanda: 'Irlanda',
      austríaca: 'Austria',
      austríaco: 'Austria',
      austria: 'Austria',
      suiza: 'Suiza',
      polaca: 'Polonia',
      polaco: 'Polonia',
      polonia: 'Polonia',
      checa: 'República Checa',
      checo: 'República Checa',
      'republica checa': 'República Checa',
      rusa: 'Rusia',
      ruso: 'Rusia',
      rusia: 'Rusia',
      ucraniana: 'Ucrania',
      ucraniano: 'Ucrania',
      ucrania: 'Ucrania',

      // Asia
      china: 'China',
      chino: 'China',
      japonesa: 'Japón',
      japonés: 'Japón',
      japon: 'Japón',
      japón: 'Japón',
      coreana: 'Corea del Sur',
      coreano: 'Corea del Sur',
      corea: 'Corea del Sur',
      'corea del sur': 'Corea del Sur',
      india: 'India',
      indio: 'India',
      hindú: 'India',
      hindu: 'India',
      tailandesa: 'Tailandia',
      tailandés: 'Tailandia',
      tailandia: 'Tailandia',
      filipina: 'Filipinas',
      filipino: 'Filipinas',
      filipinas: 'Filipinas',
      vietnamita: 'Vietnam',
      vietnam: 'Vietnam',
      indonesia: 'Indonesia',
      indonesio: 'Indonesia',

      // Oceanía
      australiana: 'Australia',
      australiano: 'Australia',
      australia: 'Australia',
      neozelandesa: 'Nueva Zelanda',
      neozelandés: 'Nueva Zelanda',
      'nueva zelanda': 'Nueva Zelanda',

      // Medio Oriente
      árabe: 'Otro',
      libanesa: 'Líbano',
      libanés: 'Líbano',
      libano: 'Líbano',
      sirio: 'Siria',
      siria: 'Siria',
      iraquí: 'Irak',
      iraqui: 'Irak',
      irak: 'Irak',
      iraní: 'Irán',
      irani: 'Irán',
      irán: 'Irán',
      israelí: 'Israel',
      israeli: 'Israel',
      israel: 'Israel',
    };

    // Si es un mapeo directo, retornarlo
    if (nationalityMappings[normalized]) {
      return nationalityMappings[normalized];
    }

    // Departamentos del Perú - todos mapean a Perú
    const peruvianDepartments = [
      'amazonas',
      'ancash',
      'apurímac',
      'apurimac',
      'arequipa',
      'ayacucho',
      'cajamarca',
      'callao',
      'cusco',
      'huancavelica',
      'huánuco',
      'huanuco',
      'ica',
      'junín',
      'junin',
      'la libertad',
      'lambayeque',
      'lima',
      'loreto',
      'madre de dios',
      'moquegua',
      'pasco',
      'piura',
      'puno',
      'san martín',
      'tacna',
      'tumbes',
    ];

    if (peruvianDepartments.includes(normalized)) {
      return 'Perú';
    }

    // Ciudades principales del Perú
    const peruvianCities = [
      'lima',
      'arequipa',
      'trujillo',
      'cusco',
      'chiclayo',
      'piura',
      'iquitos',
      'huancayo',
      'cajamarca',
      'pucallpa',
      'tacna',
      'chimbote',
      'ica',
      'juliaca',
      'ayacucho',
      'huancavelica',
      'puerto maldonado',
      'moquegua',
      'cerro de pasco',
      'huaura',
      'abancay',
      'huaraz',
      'cajabamba',
      'jaen',
      'tarapoto',
      'moyobamba',
      'tumbes',
      'sullana',
      'talara',
      'ferreñafe',
      'lambayeque',
      'pacasmayo',
      'chepen',
      'guadalupe',
      'lagunas',
      'san miguel',
      'rioja',
      'tarapoto',
      'bellavista',
      'sisa',
      'soritor',
      'morona',
      'jeberos',
      'nuevo progreso',
      'saquena',
      'lagunas',
      'yurimaguas',
      'barranca',
      'paramonga',
      'pativilca',
      'supe',
      'huacho',
      'hualmay',
      'huaral',
      ' Chancay',
      'cajatambo',
      'canta',
      'ora',
      'ricardo palma',
      'san mateo',
      'san mateo de otao',
      'laraos',
      'lamas',
      'san antonio de chuncara',
      'huañec',
      'amancaes',
      'colcabamba',
      'cangallo',
      'chincheros',
      'los morochucos',
      'parinacochas',
      'páucar del sara sara',
      'sucre',
      'lucanas',
      'aimaraes',
      'antabamba',
      'caravelí',
      'castilla',
      'caylloma',
      'condesuyos',
      'islay',
      'la unión',
      'huanca sancos',
      'huanta',
      'la mar',
      'vilcas huamán',
      'ángaraes',
      'castrovirreyna',
      'churcampa',
      'huaytará',
      'tayacaja',
      'huamalíes',
      'leoncio prado',
      'marañón',
      'pachitea',
      'puerto inca',
      'lauricocha',
      'yarowilca',
      'huacaybamba',
      'nasca',
      'palpa',
      'pisco',
      'concepción',
      'jauja',
      'junín',
      'satipo',
      'tarma',
      'yauli',
      'chupaca',
      'chancay',
      'huaura',
      'oyón',
      'yauyos',
      'maynas',
      'putumayo',
      'requena',
      'ucayali',
      'alto amazonas',
      'loreto',
      'mariscal ramón castilla',
      'datem del marañón',
      'tambopata',
      'manu',
      'tahuamanu',
      'mariscal nieto',
      'general sanchez cerro',
      'ilo',
      'pasco',
      'oxapampa',
      'daniel alcides carrión',
      'ayabaca',
      'huancabamba',
      'morropón',
      'paita',
      'sechura',
      'sullana',
      'talara',
      'contralmirante villar',
      'zarumilla',
      'azángaro',
      'carabaya',
      'chucuito',
      'el collao',
      'huancané',
      'lampa',
      'melgar',
      'moho',
      'san antonio de putina',
      'san román',
      'sandia',
      'yunguyo',
      'bellavista',
      'el dorado',
      'huallaga',
      'lamas',
      'mariscal caceres',
      'picota',
      'rioja',
      'san martín',
      'tocache',
      'candarave',
      'jorge basadre',
      'tarata',
    ];

    if (peruvianCities.includes(normalized)) {
      return 'Perú';
    }

    // Lista adicional de países comunes que podrían no estar en el mapeo principal
    const additionalCountries = [
      'afganistan',
      'albania',
      'andorra',
      'angola',
      'antigua y barbuda',
      'arabia saudita',
      'argelia',
      'armenia',
      'azerbaiyán',
      'bahamas',
      'baréin',
      'bangladesh',
      'barbados',
      'bielorrusia',
      'belau',
      'benín',
      'bután',
      'botsuana',
      'brunéi',
      'burkina faso',
      'burundi',
      'cabo verde',
      'camboya',
      'camerún',
      'república centroafricana',
      'chad',
      'comoras',
      'congo',
      'costa de marfil',
      'croacia',
      'djibouti',
      'dominica',
      'eritrea',
      'estonia',
      'esuatini',
      'etiopía',
      'fiyi',
      'gabón',
      'gambia',
      'georgia',
      'ghana',
      'granada',
      'grecia',
      'guinea',
      'guinea ecuatorial',
      'guinea-bisáu',
      'guyana',
      'haití',
      'honduras',
      'hungria',
      'islandia',
      'india',
      'indonesia',
      'irán',
      'irak',
      'irlanda',
      'israel',
      'jamaica',
      'jordania',
      'kazajistán',
      'kenia',
      'kirguistán',
      'kiribati',
      'kuwait',
      'laos',
      'lesoto',
      'letonia',
      'liberia',
      'libia',
      'liechtenstein',
      'lituania',
      'luxemburgo',
      'madagascar',
      'malasia',
      'malaui',
      'maldivas',
      'mali',
      'malta',
      'marshall',
      'mauritania',
      'mauricio',
      'micronesia',
      'moldavia',
      'monaco',
      'mongolia',
      'montenegro',
      'mozambique',
      'birmania',
      'namibia',
      'nauru',
      'nepal',
      'nicaragua',
      'níger',
      'nigeria',
      'niue',
      'macedonia del norte',
      'noruega',
      'oman',
      'pakistán',
      'palaos',
      'panamá',
      'papúa nueva guinea',
      'paraguay',
      'perú',
      'filipinas',
      'polonia',
      'portugal',
      'qatar',
      'rumania',
      'ruanda',
      'samoa',
      'san cristóbal y nieves',
      'san marino',
      'san vicente y las granadinas',
      'santa lucía',
      'santo tomé y príncipe',
      'senegal',
      'serbia',
      'seychelles',
      'sierra leona',
      'singapur',
      'eslovenia',
      'islas salomón',
      'somalia',
      'sudáfrica',
      'sudán',
      'sudán del sur',
      'surinam',
      'suecia',
      'suiza',
      'siria',
      'tayikistán',
      'tanzania',
      'timor oriental',
      'togo',
      'tonga',
      'trinidad y tobago',
      'túnez',
      'turkmenistán',
      'tuvalu',
      'uganda',
      'emiratos árabes unidos',
      'uzbekistán',
      'vanuatu',
      'ciudad del vaticano',
      'yemen',
      'zambia',
      'zimbabue',
    ];

    if (additionalCountries.includes(normalized)) {
      // Capitalizar cada palabra
      return normalized
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Casos especiales - variaciones comunes
    const specialCases: { [key: string]: string } = {
      eeuu: 'Estados Unidos',
      'ee.uu': 'Estados Unidos',
      'ee.uu.': 'Estados Unidos',
      usa: 'Estados Unidos',
      uk: 'Reino Unido',
      inglaterra: 'Reino Unido',
      france: 'Francia',
      alemania: 'Alemania',
      italia: 'Italia',
      japon: 'Japón',
      china: 'China',
      rusia: 'Rusia',
      corea: 'Corea del Sur',
      tailandia: 'Tailandia',
      vietnam: 'Vietnam',
      australia: 'Australia',
      'nueva zelanda': 'Nueva Zelanda',
      'republica dominicana': 'República Dominicana',
      'republica checa': 'República Checa',
      'corea del norte': 'Corea del Norte',
      'corea del sur': 'Corea del Sur',
      'estados unidos': 'Estados Unidos',
      'reino unido': 'Reino Unido',
      'paises bajos': 'Países Bajos',
      'el salvador': 'El Salvador',
      'costa rica': 'Costa Rica',
      'puerto rico': 'Puerto Rico',
      'trinidad y tobago': 'Trinidad y Tobago',
      'san vicente y las granadinas': 'San Vicente y las Granadinas',
      'santo tome y principe': 'Santo Tomé y Príncipe',
      'santo tomé y príncipe': 'Santo Tomé y Príncipe',
      'san cristobal y nieves': 'San Cristóbal y Nieves',
      'san cristóbal y nieves': 'San Cristóbal y Nieves',
      'antigua y barbuda': 'Antigua y Barbuda',
      'emiratos arabes unidos': 'Emiratos Árabes Unidos',
      'emiratos árabes unidos': 'Emiratos Árabes Unidos',
      sudafrica: 'Sudáfrica',
      sudáfrica: 'Sudáfrica',
      sudamerica: 'Otro',
      sudamericano: 'Otro',
      sudamericana: 'Otro',
      latinoamericano: 'Otro',
      latinoamericana: 'Otro',
      africano: 'Otro',
      africana: 'Otro',
      asiatico: 'Otro',
      asiática: 'Otro',
      europeo: 'Otro',
      europea: 'Otro',
      oceanico: 'Otro',
      oceánica: 'Otro',
    };

    if (specialCases[normalized]) {
      return specialCases[normalized];
    }

    // Si no se pudo normalizar, devolver el valor original capitalizado
    // Esto será registrado como nacionalidad no normalizada
    return (
      nationality.charAt(0).toUpperCase() + nationality.slice(1).toLowerCase()
    );
  }

  /**
   * Registra nacionalidades que no pudieron ser normalizadas
   * @param nationality Nacionalidad original
   * @param logger Logger instance
   */
  static logUnnormalizedNationality(nationality: string, logger: any) {
    if (nationality && nationality.trim()) {
      logger.warn(`Nacionalidad no normalizada detectada: "${nationality}"`);
    }
  }
}
