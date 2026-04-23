export type CanalType     = 'email' | 'linkedin' | 'otro'
export type CategoriaType = 'hiring' | 'investor' | 'partnership' | 'sales' | 'media' | 'general' | 'land' | 'press'
export type PrioridadType = 'low' | 'medium' | 'high'
export type EstadoType    = 'pendiente' | 'en_curso' | 'respondido' | 'descartado'

export interface InboxEntry {
  id:               string
  fecha:            string        // display  "06.04.2026"
  dateISO:          string        // sort key "2026-04-06"
  canal:            CanalType
  nombre:           string
  empresa:          string
  cargo:            string
  email:            string
  telefono:         string
  linkedin_url:     string
  mensaje_textual:  string
  resumen:          string
  categoria:        CategoriaType
  prioridad:        PrioridadType
  estado:           EstadoType
  notas:            string
}

export const INBOX_DATA: InboxEntry[] = [
  {
    id: 'inbox-001',
    fecha: '06.04.2026', dateISO: '2026-04-06',
    canal: 'email', nombre: 'Lucas Martin', empresa: 'no disponible', cargo: 'no disponible',
    email: 'produccioneslrm@gmail.com', telefono: '03364183225', linkedin_url: '',
    mensaje_textual: 'Buenos días, me encanta el modelo de negocio que tienen, eh minado y se el potencial que esto tiene y mas para un pais como argentina, si es posible me gustaría dejarles un cv, gracias',
    resumen: 'Consulta para enviar CV.',
    categoria: 'hiring', prioridad: 'low', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-002',
    fecha: '05.04.2026', dateISO: '2026-04-05',
    canal: 'email', nombre: 'Sebastian Alberton', empresa: 'no disponible', cargo: 'no disponible',
    email: 'salberton@hotmail.com', telefono: '3517541184', linkedin_url: '',
    mensaje_textual: 'Me gustaría saber como es el proceso para invertir en su empresa',
    resumen: 'Consulta sobre inversión.',
    categoria: 'investor', prioridad: 'high', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-003',
    fecha: '01.04.2026', dateISO: '2026-04-01',
    canal: 'email', nombre: 'Lucy', empresa: 'Actboxes', cargo: 'no disponible',
    email: 'container-lucy@anchengtong.com', telefono: '17727499315', linkedin_url: '',
    mensaje_textual: 'Dear Client, I noticed that your company will be participating in BTC 2026...',
    resumen: 'Proveedor quiere reunirse en BTC 2026.',
    categoria: 'partnership', prioridad: 'medium', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-004',
    fecha: '28.03.2026', dateISO: '2026-03-28',
    canal: 'email', nombre: 'Jonathan Abad', empresa: 'no disponible', cargo: 'Propietario',
    email: 'jonathanabadg@me.com', telefono: '+525621105543', linkedin_url: '',
    mensaje_textual: 'Estimado equipo de BigSur Energy... (terreno en Añelo)',
    resumen: 'Oferta de terreno en Vaca Muerta.',
    categoria: 'land', prioridad: 'high', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-005',
    fecha: '26.03.2026', dateISO: '2026-03-26',
    canal: 'email', nombre: 'John', empresa: 'ELLIPAL', cargo: 'no disponible',
    email: 'john@ellipal.com', telefono: '07827733144', linkedin_url: '',
    mensaje_textual: 'John here from ELLIPAL...',
    resumen: 'Co-marketing en evento.',
    categoria: 'partnership', prioridad: 'medium', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-011',
    fecha: '30.03.2026', dateISO: '2026-03-30',
    canal: 'email', nombre: 'Diego Delucchi', empresa: 'QM Argentina', cargo: 'no disponible',
    email: 'diego.delucchi@qm-e.com', telefono: '+5492235600324', linkedin_url: '',
    mensaje_textual: 'I am reaching out on behalf of QM Argentina...',
    resumen: 'Proveedor O&G ofrece soluciones.',
    categoria: 'partnership', prioridad: 'high', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-012',
    fecha: '30.03.2026', dateISO: '2026-03-30',
    canal: 'email', nombre: 'Esteban Bernath', empresa: 'EB Ingeniería', cargo: 'no disponible',
    email: 'info@ebo.com.ar', telefono: '+5491151167922', linkedin_url: '',
    mensaje_textual: 'Somos EB ingeniería...',
    resumen: 'Proveedor industrial local.',
    categoria: 'partnership', prioridad: 'medium', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-013',
    fecha: '21.03.2026', dateISO: '2026-03-21',
    canal: 'email', nombre: 'Sean Kelly', empresa: 'Digital Social Hour', cargo: 'no disponible',
    email: 'sean@digitalsocialhour.com', telefono: '7023446168', linkedin_url: '',
    mensaje_textual: 'Im filming podcasts again at Bitcoin Vegas...',
    resumen: 'Partnership podcast.',
    categoria: 'press', prioridad: 'high', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-018',
    fecha: '01.04.2026', dateISO: '2026-04-01',
    canal: 'email', nombre: 'Martin Gabbi', empresa: 'Movyas', cargo: 'no disponible',
    email: 'm.gabbi@movyas-sa.com', telefono: '1141629453', linkedin_url: '',
    mensaje_textual: 'Tenemos un slot de una turbina de gas GE Frame 6',
    resumen: 'Oferta de turbina.',
    categoria: 'partnership', prioridad: 'high', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-021',
    fecha: '25.02.2026', dateISO: '2026-02-25',
    canal: 'email', nombre: 'JJ', empresa: 'Bitcoin Mining World', cargo: 'no disponible',
    email: 'janik@bitcoinminingworld.com', telefono: '2109308212', linkedin_url: '',
    mensaje_textual: 'We met Gerrod at NAPE in Houston...',
    resumen: 'Follow up NAPE + substation.',
    categoria: 'partnership', prioridad: 'high', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-022',
    fecha: '20.01.2026', dateISO: '2026-01-20',
    canal: 'email', nombre: 'Jorge Andres Scian', empresa: 'no disponible', cargo: 'no disponible',
    email: 'jscian@tycsa.com.ar', telefono: '01153374947', linkedin_url: '',
    mensaje_textual: 'Somos una empresa metalmecánica...',
    resumen: 'Proveedor metalmecánico.',
    categoria: 'partnership', prioridad: 'medium', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-023',
    fecha: '30.12.2025', dateISO: '2025-12-30',
    canal: 'email', nombre: 'Peter Lee', empresa: 'no disponible', cargo: 'no disponible',
    email: 'jing.li@nghuafeng.com', telefono: '+8613637232777', linkedin_url: '',
    mensaje_textual: 'Happy New Year! We are planning...',
    resumen: 'Proyecto minería + energía.',
    categoria: 'partnership', prioridad: 'medium', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-024',
    fecha: '10.10.2025', dateISO: '2025-10-10',
    canal: 'email', nombre: 'Matias Derlich', empresa: 'no disponible', cargo: 'Ingeniero',
    email: 'mderlich@gmail.com', telefono: '5492974528702', linkedin_url: 'https://www.linkedin.com/in/imgderlich/',
    mensaje_textual: 'Interesado en formar parte...',
    resumen: 'Aplicación laboral.',
    categoria: 'hiring', prioridad: 'low', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-025',
    fecha: '24.10.2025', dateISO: '2025-10-24',
    canal: 'email', nombre: 'Sebastian Rodriguez Blanco', empresa: 'Energia Latina', cargo: 'no disponible',
    email: 'sebastian@energia-latina.com', telefono: '+13053386084', linkedin_url: '',
    mensaje_textual: 'contactame via whatsapp...',
    resumen: 'Propuesta de negocio.',
    categoria: 'partnership', prioridad: 'medium', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-026',
    fecha: '14.09.2025', dateISO: '2025-09-14',
    canal: 'email', nombre: 'Anthony', empresa: 'Shale Gas International', cargo: 'no disponible',
    email: 'info@shalegasinternational.com', telefono: '3617595084', linkedin_url: '',
    mensaje_textual: 'We have some deep horizontal wells...',
    resumen: 'Oferta gas Texas.',
    categoria: 'partnership', prioridad: 'high', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-027',
    fecha: '22.08.2025', dateISO: '2025-08-22',
    canal: 'email', nombre: 'Akram Gseaa', empresa: 'no disponible', cargo: 'Entrepreneur',
    email: 'a.gseaa@zazmit.ly', telefono: '+218925002680', linkedin_url: '',
    mensaje_textual: 'Hello, This is Akram Gseaa...',
    resumen: 'Expansión Libia.',
    categoria: 'partnership', prioridad: 'medium', estado: 'pendiente', notas: '',
  },
  {
    id: 'inbox-028',
    fecha: '06.04.2026', dateISO: '2026-04-06',
    canal: 'email', nombre: 'Enrique M. Algorta', empresa: 'StoneX', cargo: 'DCM',
    email: 'enrique.algorta@stonex.com', telefono: '+5491135906852', linkedin_url: '',
    mensaje_textual: 'I lead DCM & Structured Finance...',
    resumen: 'Financiamiento.',
    categoria: 'investor', prioridad: 'high', estado: 'pendiente', notas: '',
  },
]
