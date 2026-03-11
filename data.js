/* ═══════════════════════════════════════════
   BookHunt v2 — Book Data & NCERT Database
   ═══════════════════════════════════════════ */

// ── Open Library API ──
const OL_COVER = 'https://covers.openlibrary.org/b';
const OL_SEARCH = 'https://openlibrary.org/search.json';

function coverUrl(book, sz='M') {
  if (book.cover_i) return `${OL_COVER}/id/${book.cover_i}-${sz}.jpg`;
  if (book.isbn) return `${OL_COVER}/isbn/${book.isbn}-${sz}.jpg`;
  return null;
}

function ncertPdf(code, ch) {
  return `https://ncert.nic.in/textbook/pdf/${code}${String(ch).padStart(2,'0')}.pdf`;
}

function ncertPage(code, total) {
  return `https://ncert.nic.in/textbook.php?${code}=0-${total}`;
}

// ── Category Tree ──
const CATEGORIES = [
  { id:'cbse', name:'CBSE', icon:'🏫', subs: [
    {id:'cbse-6',name:'Class 6'},{id:'cbse-7',name:'Class 7'},{id:'cbse-8',name:'Class 8'},
    {id:'cbse-9',name:'Class 9'},{id:'cbse-10',name:'Class 10'},{id:'cbse-11',name:'Class 11'},{id:'cbse-12',name:'Class 12'}
  ]},
  { id:'icse', name:'ICSE', icon:'🎓', subs: [
    {id:'icse-6',name:'Class 6'},{id:'icse-7',name:'Class 7'},{id:'icse-8',name:'Class 8'},
    {id:'icse-9',name:'Class 9'},{id:'icse-10',name:'Class 10'},{id:'icse-11',name:'Class 11'},{id:'icse-12',name:'Class 12'}
  ]},
  { id:'college', name:'College', icon:'🎒', subs: [
    {id:'col-eng',name:'Engineering'},{id:'col-med',name:'Medical'},{id:'col-com',name:'Commerce'},{id:'col-art',name:'Arts'}
  ]},
  { id:'exams', name:'Competitive Exams', icon:'🏆', subs: [
    {id:'ex-jee',name:'JEE'},{id:'ex-neet',name:'NEET'},{id:'ex-upsc',name:'UPSC'},{id:'ex-cat',name:'CAT'}
  ]},
  { id:'skills', name:'Skills & Tech', icon:'💻', subs: [
    {id:'sk-prog',name:'Programming'},{id:'sk-ai',name:'AI & Data Science'},{id:'sk-design',name:'Design & UI/UX'},{id:'sk-mark',name:'Marketing'}
  ]},
  { id:'languages', name:'Language Hub', icon:'🗣️', subs: [
    {id:'lang-eng',name:'English Mastery'},{id:'lang-hin',name:'Hindi Sahitya'},{id:'lang-san',name:'Sanskrit'}
  ]},
  { id:'stateboards', name:'State Boards', icon:'🇮🇳', subs: [
    {id:'sb-maha',name:'Maharashtra Board'},{id:'sb-up',name:'UP Board'},{id:'sb-wb',name:'West Bengal Board'}
  ]}
];

// ── NCERT Books Database ──
// code = NCERT textbook code, ch = number of chapters
const NCERT = {
  'cbse-6': [
    {id:'n601',title:'Mathematics',author:'NCERT',code:'femh1',ch:14,subject:'Mathematics',emoji:'📐',gradient:'linear-gradient(135deg,#6c5ce7,#a29bfe)',
     chapters:['Knowing Our Numbers','Whole Numbers','Playing with Numbers','Basic Geometrical Ideas','Understanding Elementary Shapes','Integers','Fractions','Decimals','Data Handling','Mensuration','Algebra','Ratio and Proportion','Symmetry','Practical Geometry']},
    {id:'n602',title:'Science',author:'NCERT',code:'fesc1',ch:16,subject:'Science',emoji:'🔬',gradient:'linear-gradient(135deg,#00b894,#00cec9)',
     chapters:['Food: Where Does It Come From?','Components of Food','Fibre to Fabric','Sorting Materials','Separation of Substances','Changes Around Us','Getting to Know Plants','Body Movements','The Living Organisms','Motion and Measurement','Light, Shadows and Reflections','Electricity and Circuits','Fun with Magnets','Water','Air Around Us','Garbage In, Garbage Out']},
    {id:'n603',title:'Social Science - History',author:'NCERT',code:'fess1',ch:11,subject:'History',emoji:'📜',gradient:'linear-gradient(135deg,#fdcb6e,#e17055)',
     chapters:['What, Where, How and When?','From Hunting-Gathering to Growing Food','In the Earliest Cities','What Books and Burials Tell Us','Kingdoms, Kings and an Early Republic','New Questions and Ideas','Ashoka, The Emperor','Vital Villages, Thriving Towns','Traders, Kings and Pilgrims','New Empires and Kingdoms','Buildings, Paintings and Books']},
    {id:'n604',title:'English - Honeysuckle',author:'NCERT',code:'fehl1',ch:10,subject:'English',emoji:'📖',gradient:'linear-gradient(135deg,#636e72,#b2bec3)',
     chapters:['Who Did Patrick\'s Homework?','How the Dog Found Himself a New Master!','Taro\'s Reward','An Indian-American Woman in Space','A Different Kind of School','Who I Am','Fair Play','A Game of Chance','Desert Animals','The Banyan Tree']}
  ],
  'cbse-7': [
    {id:'n701',title:'Mathematics',author:'NCERT',code:'gemh1',ch:15,subject:'Mathematics',emoji:'📐',gradient:'linear-gradient(135deg,#6c5ce7,#a29bfe)',
     chapters:['Integers','Fractions and Decimals','Data Handling','Simple Equations','Lines and Angles','The Triangle and its Properties','Congruence of Triangles','Comparing Quantities','Rational Numbers','Practical Geometry','Perimeter and Area','Algebraic Expressions','Exponents and Powers','Symmetry','Visualising Solid Shapes']},
    {id:'n702',title:'Science',author:'NCERT',code:'gesc1',ch:18,subject:'Science',emoji:'🔬',gradient:'linear-gradient(135deg,#00b894,#00cec9)',
     chapters:['Nutrition in Plants','Nutrition in Animals','Fibre to Fabric','Heat','Acids, Bases and Salts','Physical and Chemical Changes','Weather, Climate and Adaptations','Winds, Storms and Cyclones','Soil','Respiration in Organisms','Transportation in Animals and Plants','Reproduction in Plants','Motion and Time','Electric Current and its Effects','Light','Water: A Precious Resource','Forests: Our Lifeline','Wastewater Story']}
  ],
  'cbse-8': [
    {id:'n801',title:'Mathematics',author:'NCERT',code:'hemh1',ch:16,subject:'Mathematics',emoji:'📐',gradient:'linear-gradient(135deg,#6c5ce7,#a29bfe)',
     chapters:['Rational Numbers','Linear Equations in One Variable','Understanding Quadrilaterals','Practical Geometry','Data Handling','Squares and Square Roots','Cubes and Cube Roots','Comparing Quantities','Algebraic Expressions','Visualising Solid Shapes','Mensuration','Exponents and Powers','Direct and Inverse Proportions','Factorisation','Introduction to Graphs','Playing with Numbers']},
    {id:'n802',title:'Science',author:'NCERT',code:'hesc1',ch:18,subject:'Science',emoji:'🔬',gradient:'linear-gradient(135deg,#00b894,#00cec9)',
     chapters:['Crop Production and Management','Microorganisms','Synthetic Fibres and Plastics','Materials: Metals and Non-Metals','Coal and Petroleum','Combustion and Flame','Conservation of Plants and Animals','Cell - Structure and Functions','Reproduction in Animals','Reaching the Age of Adolescence','Force and Pressure','Friction','Sound','Chemical Effects of Electric Current','Some Natural Phenomena','Light','Stars and the Solar System','Pollution of Air and Water']}
  ],
  'cbse-9': [
    {id:'n901',title:'Mathematics',author:'NCERT',code:'iemh1',ch:15,subject:'Mathematics',emoji:'📐',gradient:'linear-gradient(135deg,#6c5ce7,#a29bfe)',
     chapters:['Number Systems','Polynomials','Coordinate Geometry','Linear Equations in Two Variables','Introduction to Euclid\'s Geometry','Lines and Angles','Triangles','Quadrilaterals','Areas of Parallelograms and Triangles','Circles','Constructions','Heron\'s Formula','Surface Areas and Volumes','Statistics','Probability']},
    {id:'n902',title:'Science',author:'NCERT',code:'iesc1',ch:15,subject:'Science',emoji:'🔬',gradient:'linear-gradient(135deg,#00b894,#00cec9)',
     chapters:['Matter in Our Surroundings','Is Matter Around Us Pure?','Atoms and Molecules','Structure of the Atom','The Fundamental Unit of Life','Tissues','Diversity in Living Organisms','Motion','Force and Laws of Motion','Gravitation','Work and Energy','Sound','Why Do We Fall Ill?','Natural Resources','Improvement in Food Resources']}
  ],
  'cbse-10': [
    {id:'n1001',title:'Mathematics',author:'NCERT',code:'jemh1',ch:15,subject:'Mathematics',emoji:'📐',gradient:'linear-gradient(135deg,#6c5ce7,#a29bfe)',
     chapters:['Real Numbers','Polynomials','Pair of Linear Equations','Quadratic Equations','Arithmetic Progressions','Triangles','Coordinate Geometry','Introduction to Trigonometry','Some Applications of Trigonometry','Circles','Constructions','Areas Related to Circles','Surface Areas and Volumes','Statistics','Probability']},
    {id:'n1002',title:'Science',author:'NCERT',code:'jesc1',ch:16,subject:'Science',emoji:'🔬',gradient:'linear-gradient(135deg,#00b894,#00cec9)',
     chapters:['Chemical Reactions and Equations','Acids, Bases and Salts','Metals and Non-metals','Carbon and its Compounds','Periodic Classification of Elements','Life Processes','Control and Coordination','How do Organisms Reproduce?','Heredity and Evolution','Light - Reflection and Refraction','Human Eye','Electricity','Magnetic Effects of Electric Current','Sources of Energy','Our Environment','Management of Natural Resources']}
  ],
  'cbse-11': [
    {id:'n1101',title:'Mathematics',author:'NCERT',code:'kemh1',ch:16,subject:'Mathematics',emoji:'📐',gradient:'linear-gradient(135deg,#6c5ce7,#a29bfe)',
     chapters:['Sets','Relations and Functions','Trigonometric Functions','Principle of Mathematical Induction','Complex Numbers','Linear Inequalities','Permutations and Combinations','Binomial Theorem','Sequences and Series','Straight Lines','Conic Sections','Introduction to 3D Geometry','Limits and Derivatives','Mathematical Reasoning','Statistics','Probability']},
    {id:'n1102',title:'Physics Part I',author:'NCERT',code:'keph1',ch:8,subject:'Physics',emoji:'⚛️',gradient:'linear-gradient(135deg,#e84393,#fd79a8)',
     chapters:['Physical World','Units and Measurements','Motion in a Straight Line','Motion in a Plane','Laws of Motion','Work, Energy and Power','System of Particles','Gravitation']},
    {id:'n1103',title:'Physics Part II',author:'NCERT',code:'keph2',ch:7,subject:'Physics',emoji:'⚛️',gradient:'linear-gradient(135deg,#e84393,#fd79a8)',
     chapters:['Mechanical Properties of Solids','Mechanical Properties of Fluids','Thermal Properties of Matter','Thermodynamics','Kinetic Theory','Oscillations','Waves']},
    {id:'n1104',title:'Chemistry Part I',author:'NCERT',code:'kech1',ch:7,subject:'Chemistry',emoji:'🧪',gradient:'linear-gradient(135deg,#fdcb6e,#e17055)',
     chapters:['Some Basic Concepts of Chemistry','Structure of Atom','Classification of Elements','Chemical Bonding','States of Matter','Thermodynamics','Equilibrium']},
    {id:'n1105',title:'Chemistry Part II',author:'NCERT',code:'kech2',ch:7,subject:'Chemistry',emoji:'🧪',gradient:'linear-gradient(135deg,#fdcb6e,#e17055)',
     chapters:['Redox Reactions','Hydrogen','The s-Block Elements','The p-Block Elements','Organic Chemistry','Hydrocarbons','Environmental Chemistry']},
    {id:'n1106',title:'Biology',author:'NCERT',code:'kebo1',ch:22,subject:'Biology',emoji:'🧬',gradient:'linear-gradient(135deg,#00cec9,#81ecec)',
     chapters:['The Living World','Biological Classification','Plant Kingdom','Animal Kingdom','Morphology of Flowering Plants','Anatomy of Flowering Plants','Structural Organisation in Animals','Cell: The Unit of Life','Biomolecules','Cell Cycle','Transport in Plants','Mineral Nutrition','Photosynthesis','Respiration','Plant Growth','Digestion','Breathing','Body Fluids','Excretory Products','Locomotion','Neural Control','Chemical Coordination']}
  ],
  'cbse-12': [
    {id:'n1201',title:'Mathematics Part I',author:'NCERT',code:'lemh1',ch:6,subject:'Mathematics',emoji:'📐',gradient:'linear-gradient(135deg,#6c5ce7,#a29bfe)',
     chapters:['Relations and Functions','Inverse Trigonometric Functions','Matrices','Determinants','Continuity and Differentiability','Application of Derivatives']},
    {id:'n1202',title:'Mathematics Part II',author:'NCERT',code:'lemh2',ch:7,subject:'Mathematics',emoji:'📐',gradient:'linear-gradient(135deg,#6c5ce7,#a29bfe)',
     chapters:['Integrals','Application of Integrals','Differential Equations','Vector Algebra','Three Dimensional Geometry','Linear Programming','Probability']},
    {id:'n1203',title:'Physics Part I',author:'NCERT',code:'leph1',ch:8,subject:'Physics',emoji:'⚛️',gradient:'linear-gradient(135deg,#e84393,#fd79a8)',
     chapters:['Electric Charges and Fields','Electrostatic Potential','Current Electricity','Moving Charges and Magnetism','Magnetism and Matter','Electromagnetic Induction','Alternating Current','Electromagnetic Waves']},
    {id:'n1204',title:'Physics Part II',author:'NCERT',code:'leph2',ch:6,subject:'Physics',emoji:'⚛️',gradient:'linear-gradient(135deg,#e84393,#fd79a8)',
     chapters:['Ray Optics','Wave Optics','Dual Nature of Radiation','Atoms','Nuclei','Semiconductor Electronics']},
    {id:'n1205',title:'Chemistry Part I',author:'NCERT',code:'lech1',ch:7,subject:'Chemistry',emoji:'🧪',gradient:'linear-gradient(135deg,#fdcb6e,#e17055)',
     chapters:['The Solid State','Solutions','Electrochemistry','Chemical Kinetics','Surface Chemistry','General Principles of Isolation','The p-Block Elements']},
    {id:'n1206',title:'Chemistry Part II',author:'NCERT',code:'lech2',ch:9,subject:'Chemistry',emoji:'🧪',gradient:'linear-gradient(135deg,#fdcb6e,#e17055)',
     chapters:['The d and f Block Elements','Coordination Compounds','Haloalkanes','Alcohols, Phenols and Ethers','Aldehydes, Ketones','Amines','Biomolecules','Polymers','Chemistry in Everyday Life']},
    {id:'n1207',title:'Biology',author:'NCERT',code:'lebo1',ch:16,subject:'Biology',emoji:'🧬',gradient:'linear-gradient(135deg,#00cec9,#81ecec)',
     chapters:['Reproduction in Organisms','Sexual Reproduction in Flowering Plants','Human Reproduction','Reproductive Health','Principles of Inheritance','Molecular Basis of Inheritance','Evolution','Human Health and Disease','Strategies for Enhancement','Microbes in Human Welfare','Biotechnology: Principles','Biotechnology and its Applications','Organisms and Populations','Ecosystem','Biodiversity and Conservation','Environmental Issues']}
  ]
};

// ICSE uses same NCERT books for most subjects, plus additional references
// We'll copy CBSE structure and add ICSE-specific books via Open Library
const ICSE_QUERIES = {
  'icse-6':  'ICSE class 6 textbook',
  'icse-7':  'ICSE class 7 textbook',
  'icse-8':  'ICSE class 8 textbook',
  'icse-9':  'ICSE class 9 textbook',
  'icse-10': 'ICSE class 10 textbook',
  'icse-11': 'ISC class 11 textbook',
  'icse-12': 'ISC class 12 textbook'
};

// College & Exam queries for Open Library
const OL_QUERIES = {
  'col-eng':  ['engineering mathematics','data structures algorithms','digital electronics','thermodynamics engineering','engineering mechanics','computer networks','operating systems','database management systems'],
  'col-med':  ['gray anatomy','guyton medical physiology','robbins pathology','harrison internal medicine','biochemistry stryer','pharmacology goodman'],
  'col-com':  ['financial accounting','business economics','corporate law','cost accounting','income tax','business statistics'],
  'col-art':  ['indian history','political science','sociology','psychology','philosophy','english literature'],
  'ex-jee':   ['IIT JEE physics','JEE advanced mathematics','JEE chemistry concepts','HC Verma physics','irodov problems','RD Sharma mathematics'],
  'ex-neet':  ['NEET biology','NEET physics','NEET chemistry','trueman biology','DC pandey physics'],
  'ex-upsc':  ['indian polity laxmikanth','indian economy ramesh singh','UPSC general studies','geography UPSC','modern india history','NCERT UPSC'],
  'ex-cat':   ['quantitative aptitude CAT','verbal ability CAT','logical reasoning','data interpretation','MBA entrance','arun sharma CAT'],
  'sk-prog':  ['javascript programming','python crash course','java complete reference','c++ programming','node.js design patterns','react development'],
  'sk-ai':    ['machine learning','artificial intelligence','data science handbook','deep learning','neural networks','natural language processing'],
  'sk-design':['graphic design principles','UI UX design','web design','adobe photoshop','figma design','typography'],
  'sk-mark':  ['digital marketing','social media marketing','brand management','advertising strategy','copywriting'],
  'lang-eng': ['english grammar wren martin','oxford english dictionary','vocabulary building','english literature classics'],
  'lang-hin': ['hindi literature','premchand godan','hindi grammar','kabir ke dohe','mahavir prasad dwivedi'],
  'lang-san': ['sanskrit grammar','panini ashtadhyayi','bhagavad gita sanskrit','sanskrit hitopadesha'],
  'sb-maha':  ['maharashtra state board textbooks','SSC HSC maharashtra','maharashtra board science'],
  'sb-up':    ['UP board textbooks','uttar pradesh board math','UP board science hindi'],
  'sb-wb':    ['west bengal board textbooks','madhyamik books','higher secondary west bengal']
};

// Gradient palette for API books
const GRADIENTS = [
  'linear-gradient(135deg,#6c5ce7,#a29bfe)','linear-gradient(135deg,#00b894,#00cec9)',
  'linear-gradient(135deg,#fdcb6e,#e17055)','linear-gradient(135deg,#e84393,#fd79a8)',
  'linear-gradient(135deg,#0984e3,#74b9ff)','linear-gradient(135deg,#636e72,#b2bec3)',
  'linear-gradient(135deg,#00cec9,#81ecec)','linear-gradient(135deg,#e17055,#fab1a0)',
  'linear-gradient(135deg,#a29bfe,#dfe6e9)','linear-gradient(135deg,#fd79a8,#fdcb6e)'
];
const SUBJ_EMOJI = {'Computer Science':'💻','Physics':'⚛️','Mathematics':'📐','Chemistry':'🧪','Literature':'📖','Business':'📊','Biology':'🧬','History':'📜','Engineering':'⚙️','Medical':'🏥','Commerce':'💰','Arts':'🎨','General':'📚','Programming':'👨‍💻','AI':'🤖','Design':'🎨','Marketing':'📈','English':'🇬🇧','Hindi':'🇮🇳','Sanskrit':'📜'};
