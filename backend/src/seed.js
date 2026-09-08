require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Establishment = require('./models/Establishment');
const User = require('./models/User');
const Routine = require('./models/Routine');
const RoutineSection = require('./models/RoutineSection');
const Task = require('./models/Task');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/london_cafe';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Conectado, limpiando datos existentes...');

  await Promise.all([
    Establishment.deleteMany({}),
    User.deleteMany({}),
    Routine.deleteMany({}),
    RoutineSection.deleteMany({}),
    Task.deleteMany({}),
  ]);

  const establishment = await Establishment.create({
    name: 'London Cafe CDJ',
    address: 'Av. Principal 123',
  });

  const passwordHash = await bcrypt.hash('123456', 10);
  const admin = await User.create({
    name: 'Admin London Cafe CDJ',
    username: 'admin',
    email: 'admin@londoncafe.com',
    passwordHash,
    role: 'admin',
    establishmentId: establishment._id,
  });
  const employee = await User.create({
    name: 'Juan Pérez',
    username: 'juan',
    email: 'juan@londoncafe.com',
    passwordHash,
    role: 'employee',
    establishmentId: establishment._id,
  });
  const employee2 = await User.create({
    name: 'María García',
    username: 'maria',
    email: 'maria@londoncafe.com',
    passwordHash,
    role: 'employee',
    establishmentId: establishment._id,
  });

  // ---- RUTINA 1: APERTURA (Inicio de servicio matutino) ----
  const apertura = await Routine.create({
    name: 'Apertura',
    description: 'Protocolo de apertura, encendido y preparación inicial del local',
    type: 'apertura',
    icon: 'sunrise',
    shift: 'apertura',
    establishmentId: establishment._id,
    schedule: '06:00 - 08:00',
    order: 1,
  });

  const aperturaSectionsData = [
    {
      name: 'Llegada y Seguridad Inicial',
      icon: 'door',
      order: 1,
      required: true,
      tasks: [
        { title: 'Desactivar alarma y encender iluminación', type: 'checkbox', icon: 'shield' },
        { title: 'Abrir establecimiento y verificar candados', type: 'checkbox', icon: 'door' },
        { title: 'Revisar que no existan anomalías o forzaduras', type: 'confirmation', icon: 'clipboard' },
        { title: 'Revisar estado de accesos, cristales y ventanas', type: 'confirmation', icon: 'lock' },
      ],
    },
    {
      name: 'Limpieza y Acondicionamiento de Barra',
      icon: 'broom',
      order: 2,
      required: true,
      tasks: [
        { title: 'Barrer y trapear área de clientes y servicio', type: 'checkbox', icon: 'broom' },
        { title: 'Sanitizar mesas, sillas y periqueras', type: 'checkbox', icon: 'customers' },
        { title: 'Limpieza y desinfección profunda de barra y contrabarra', type: 'checkbox', icon: 'bar' },
        { title: 'Colocar bolsas nuevas en botes de basura', type: 'checkbox', icon: 'trash' },
      ],
    },
    {
      name: 'Calibración de Equipos y Temperaturas',
      icon: 'coffee',
      order: 3,
      required: true,
      tasks: [
        { title: 'Encendido y purga de máquina de espresso', type: 'confirmation', icon: 'coffee' },
        { title: 'Calibrar molienda, peso de dosis y tiempo de extracción', type: 'confirmation', icon: 'coffee' },
        {
          title: 'Registrar temperatura del refrigerador de lácteos',
          type: 'temperature',
          icon: 'inventory',
          config: { unit: '°C', min: 0, max: 8 },
        },
        { title: 'Verificar nivel y funcionamiento de máquina de hielo', type: 'confirmation', icon: 'coffee' },
        {
          title: 'Evidencia fotográfica de estación de espresso lista',
          type: 'photo_confirmation',
          icon: 'camera',
          requiresPhoto: true,
        },
      ],
    },
    {
      name: 'Mise en Place e Insumos',
      icon: 'package',
      order: 4,
      required: true,
      tasks: [
        { title: 'Revisar stock de leches (entera, deslactosada, avena, almendra)', type: 'checkbox', icon: 'package' },
        { title: 'Verificar vasos térmicos, fríos y tapas', type: 'checkbox', icon: 'coffee' },
        { title: 'Rellenar dispensadores de servilletas, agitadores y azúcar', type: 'checkbox', icon: 'package' },
        { title: 'Revisar jarabes, pulpas, tisanas y tés', type: 'checkbox', icon: 'package' },
      ],
    },
  ];

  for (const s of aperturaSectionsData) {
    const section = await RoutineSection.create({
      routineId: apertura._id,
      name: s.name,
      icon: s.icon,
      order: s.order,
      required: s.required,
    });
    let order = 1;
    for (const t of s.tasks) {
      await Task.create({
        sectionId: section._id,
        title: t.title,
        type: t.type,
        icon: t.icon || 'checklist',
        order: order++,
        required: t.required !== false,
        requiresPhoto: !!t.requiresPhoto,
        config: t.config || {},
      });
    }
  }

  // ---- RUTINA 2: OPERACIÓN CONTINUA (Durante el turno) ----
  const operacion = await Routine.create({
    name: 'Operación Continua (Turno Apertura)',
    description: 'Verificaciones y mantenimiento del estándar de calidad durante el servicio matutino',
    type: 'operacion',
    icon: 'coffee',
    shift: 'apertura',
    establishmentId: establishment._id,
    schedule: '08:00 - 15:00',
    order: 2,
  });

  const operacionSectionsData = [
    {
      name: 'Higiene y Sanitización Continua',
      icon: 'restroom',
      order: 1,
      required: true,
      tasks: [
        { title: 'Revisar limpieza, secado y orden de sanitarios', type: 'confirmation', icon: 'broom' },
        { title: 'Verificar papel higiénico, toallas de mano y jabón antibacterial', type: 'checkbox', icon: 'package' },
        { title: 'Retirar loza sucia y limpiar mesas desocupadas', type: 'checkbox', icon: 'customers' },
        { title: 'Limpieza de rejillas de espresso y lancetas de vapor', type: 'checkbox', icon: 'coffee' },
      ],
    },
    {
      name: 'Control de Calidad y Bebidas',
      icon: 'coffee',
      order: 2,
      required: true,
      tasks: [
        { title: 'Pesar y probar tiro de espresso de control', type: 'confirmation', icon: 'coffee' },
        { title: 'Verificar temperatura y textura de leche al vaporizar', type: 'confirmation', icon: 'coffee' },
        { title: 'Mantener vitrina de postres y repostería limpia y ordenada', type: 'checkbox', icon: 'inventory' },
        {
          title: 'Evidencia fotográfica del área de clientes en orden',
          type: 'photo_confirmation',
          icon: 'camera',
          requiresPhoto: true,
        },
      ],
    },
    {
      name: 'Reposición de Insumos en Piso',
      icon: 'package',
      order: 3,
      required: false,
      tasks: [
        { title: 'Reponer leches, jarabes y tés en estación de servicio', type: 'checkbox', icon: 'package' },
        { title: 'Reponer vasos, tapas y agitadores en barra', type: 'checkbox', icon: 'coffee' },
        { title: 'Verificar nivel de hielo y reponer si es necesario', type: 'quantity', icon: 'package', config: { unit: 'bolsas', min: 0, max: 10 } },
        { title: 'Registrar producto agotado o próximo a agotarse', type: 'text', icon: 'clipboard', required: false },
      ],
    },
  ];

  for (const s of operacionSectionsData) {
    const section = await RoutineSection.create({
      routineId: operacion._id,
      name: s.name,
      icon: s.icon,
      order: s.order,
      required: s.required,
    });
    let order = 1;
    for (const t of s.tasks) {
      await Task.create({
        sectionId: section._id,
        title: t.title,
        type: t.type,
        icon: t.icon || 'checklist',
        order: order++,
        required: t.required !== false,
        requiresPhoto: !!t.requiresPhoto,
        config: t.config || {},
      });
    }
  }

  // ---- RUTINA 3: RELEVO Y CAMBIO DE TURNO (Entrega entre colaboradores) ----
  const relevo = await Routine.create({
    name: 'Relevo de Turno',
    description: 'Protocolo de entrega de barra, corte de caja y traspaso de estación',
    type: 'cambio_turno',
    icon: 'shift-change',
    shift: 'ambos',
    establishmentId: establishment._id,
    schedule: '14:30 - 15:30',
    order: 3,
  });

  const relevoSectionsData = [
    {
      name: 'Corte de Turno y Caja',
      icon: 'clipboard',
      order: 1,
      required: true,
      tasks: [
        { title: 'Realizar corte parcial y arqueo de caja registradora', type: 'confirmation', icon: 'clipboard' },
        { title: 'Verificar fondo de caja y cambio para siguiente turno', type: 'checkbox', icon: 'package' },
        { title: 'Registrar notas de ventas o pendientes administrativos', type: 'text', icon: 'clipboard', required: false },
      ],
    },
    {
      name: 'Entrega de Estación y Merma',
      icon: 'bar',
      order: 2,
      required: true,
      tasks: [
        { title: 'Dejar estación de barra limpia, seca y ordenada', type: 'confirmation', icon: 'bar' },
        { title: 'Rellenar granos en tolva de café para el relevo', type: 'checkbox', icon: 'coffee' },
        { title: 'Registrar mermas de insumos o alimentos no conformes', type: 'text', icon: 'warning', required: false },
        {
          title: 'Foto de entrega de barra en perfectas condiciones',
          type: 'photo_confirmation',
          icon: 'camera',
          requiresPhoto: true,
        },
      ],
    },
  ];

  for (const s of relevoSectionsData) {
    const section = await RoutineSection.create({
      routineId: relevo._id,
      name: s.name,
      icon: s.icon,
      order: s.order,
      required: s.required,
    });
    let order = 1;
    for (const t of s.tasks) {
      await Task.create({
        sectionId: section._id,
        title: t.title,
        type: t.type,
        icon: t.icon || 'checklist',
        order: order++,
        required: t.required !== false,
        requiresPhoto: !!t.requiresPhoto,
        config: t.config || {},
      });
    }
  }

  // ---- RUTINA 4: OPERACIÓN CONTINUA (Turno Cierre) ----
  const operacionCierre = await Routine.create({
    name: 'Operación Continua (Turno Cierre)',
    description: 'Verificaciones y mantenimiento del estándar de calidad durante el servicio vespertino/nocturno',
    type: 'operacion',
    icon: 'coffee',
    shift: 'cierre',
    establishmentId: establishment._id,
    schedule: '15:30 - 21:00',
    order: 4,
  });

  const operacionCierreSectionsData = [
    {
      name: 'Higiene y Sanitización Continua',
      icon: 'restroom',
      order: 1,
      required: true,
      tasks: [
        { title: 'Revisar limpieza, secado y orden de sanitarios', type: 'confirmation', icon: 'broom' },
        { title: 'Verificar papel higiénico, toallas de mano y jabón antibacterial', type: 'checkbox', icon: 'package' },
        { title: 'Retirar loza sucia y limpiar mesas desocupadas', type: 'checkbox', icon: 'customers' },
        { title: 'Limpieza de rejillas de espresso y lancetas de vapor', type: 'checkbox', icon: 'coffee' },
      ],
    },
    {
      name: 'Control de Calidad y Bebidas',
      icon: 'coffee',
      order: 2,
      required: true,
      tasks: [
        { title: 'Pesar y probar tiro de espresso de control', type: 'confirmation', icon: 'coffee' },
        { title: 'Verificar temperatura y textura de leche al vaporizar', type: 'confirmation', icon: 'coffee' },
        { title: 'Mantener vitrina de postres y repostería limpia y ordenada', type: 'checkbox', icon: 'inventory' },
      ],
    },
    {
      name: 'Reposición de Insumos en Piso',
      icon: 'package',
      order: 3,
      required: false,
      tasks: [
        { title: 'Reponer leches, jarabes y tés en estación de servicio', type: 'checkbox', icon: 'package' },
        { title: 'Reponer vasos, tapas y agitadores en barra', type: 'checkbox', icon: 'coffee' },
        { title: 'Verificar nivel de hielo y reponer si es necesario', type: 'quantity', icon: 'package', config: { unit: 'bolsas', min: 0, max: 10 } },
        { title: 'Registrar producto agotado o próximo a agotarse', type: 'text', icon: 'clipboard', required: false },
      ],
    },
  ];

  for (const s of operacionCierreSectionsData) {
    const section = await RoutineSection.create({
      routineId: operacionCierre._id,
      name: s.name,
      icon: s.icon,
      order: s.order,
      required: s.required,
    });
    let order = 1;
    for (const t of s.tasks) {
      await Task.create({
        sectionId: section._id,
        title: t.title,
        type: t.type,
        icon: t.icon || 'checklist',
        order: order++,
        required: t.required !== false,
        requiresPhoto: !!t.requiresPhoto,
        config: t.config || {},
      });
    }
  }

  // ---- RUTINA 5: CIERRE (Fin de operaciones y resguardo) ----
  const cierre = await Routine.create({
    name: 'Cierre de Establecimiento',
    description: 'Sanitización profunda, purga de máquinas y aseguramiento del local',
    type: 'cierre',
    icon: 'moon',
    shift: 'cierre',
    establishmentId: establishment._id,
    schedule: '21:00 - 22:30',
    order: 5,
  });

  const cierreSectionsData = [
    {
      name: 'Limpieza Profunda de Equipos',
      icon: 'coffee',
      order: 1,
      required: true,
      tasks: [
        { title: 'Realizar retrolavado con químico a grupos de espresso', type: 'confirmation', icon: 'coffee' },
        { title: 'Desarmar, remojar y limpiar lancetas de vapor', type: 'confirmation', icon: 'coffee' },
        { title: 'Vaciar, limpiar y guardar granos de tolva en contenedor hermético', type: 'checkbox', icon: 'package' },
        { title: 'Apagar máquina de espresso y desconectar periféricos indicados', type: 'checkbox', icon: 'shield' },
      ],
    },
    {
      name: 'Higiene Integral y Cierre Seguro',
      icon: 'lock',
      order: 2,
      required: true,
      tasks: [
        { title: 'Barrer, trapear y desinfectar todas las áreas', type: 'checkbox', icon: 'broom' },
        { title: 'Sacar toda la basura y desinfectar botes', type: 'checkbox', icon: 'trash' },
        { title: 'Verificar candados, accesos y cámaras de seguridad', type: 'confirmation', icon: 'lock' },
        { title: 'Activar sistema de alarma y apagar luces', type: 'checkbox', icon: 'shield' },
        {
          title: 'Evidencia fotográfica de local cerrado y seguro',
          type: 'photo_confirmation',
          icon: 'camera',
          requiresPhoto: true,
        },
      ],
    },
    {
      name: 'Cierre de Caja y Resguardo de Valores',
      icon: 'cash',
      order: 3,
      required: true,
      tasks: [
        { title: 'Realizar corte final de caja del día', type: 'confirmation', icon: 'cash' },
        { title: 'Contar y resguardar efectivo en caja fuerte', type: 'confirmation', icon: 'cash' },
        { title: 'Registrar ventas totales, propinas y diferencias', type: 'text', icon: 'clipboard' },
        { title: 'Dejar fondo de caja listo para la apertura del día siguiente', type: 'checkbox', icon: 'cash' },
      ],
    },
  ];

  for (const s of cierreSectionsData) {
    const section = await RoutineSection.create({
      routineId: cierre._id,
      name: s.name,
      icon: s.icon,
      order: s.order,
      required: s.required,
    });
    let order = 1;
    for (const t of s.tasks) {
      await Task.create({
        sectionId: section._id,
        title: t.title,
        type: t.type,
        icon: t.icon || 'checklist',
        order: order++,
        required: t.required !== false,
        requiresPhoto: !!t.requiresPhoto,
        config: t.config || {},
      });
    }
  }

  console.log('Seed completado.');
  console.log(`Establecimiento: ${establishment.name} (${establishment._id})`);
  console.log(`Admin: 'Admin London Cafe CDJ' o 'admin' / contraseña: 123456`);
  console.log(`Empleado: 'Juan Pérez' o 'juan' / contraseña: 123456`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
