const db = require('./db');
const NormalizationService = require('../app/Services/NormalizationService');

function seedDatabase() {
  console.log('--- Starting Database Seeding ---');

  // Clear existing data
  db.exec('DELETE FROM product_attribute_values;');
  db.exec('DELETE FROM products;');
  db.exec('DELETE FROM categories;');
  db.exec('DELETE FROM attributes;');
  db.exec('DELETE FROM lexicon_entries;');

  // 1. Seed Categories
  const insertCategory = db.prepare('INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)');
  const categoriesData = [
    [1, 'الحقائب والأحذية', 'bags-shoes', 'تشكيلة مميزة من حقائب الظهر والسفر والأحذية الرياضية والجلدية'],
    [2, 'الإلكترونيات والهواتف', 'electronics', 'أحدث الهواتف الذكية وأجهزة الحاسوب المحمول والسماعات'],
    [3, 'الأثاث والمفروشات', 'furniture', 'أثاث منزلي عصري ومريح يشمل الأرائك والطاولات والمكاتب'],
    [4, 'الملابس والأزياء', 'clothing', 'أزياء راقية تشمل القمصان والسراويل والسترات الشتوية'],
    [5, 'الأجهزة المنزلية', 'appliances', 'أجهزة المطبخ والمنزل العصرية من الثلاجات والغسالات']
  ];
  for (const cat of categoriesData) {
    insertCategory.run(...cat);
  }

  // 2. Seed Attributes
  const insertAttr = db.prepare('INSERT INTO attributes (id, name) VALUES (?, ?)');
  const attributesData = [
    [1, 'اللون'],
    [2, 'المقاس'],
    [3, 'النوع'],
    [4, 'السعة'],
    [5, 'المادة']
  ];
  for (const attr of attributesData) {
    insertAttr.run(...attr);
  }

  // 3. Seed Products
  const insertProduct = db.prepare(`
    INSERT INTO products (id, category_id, name, description, price, original_price, image_url, in_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const productsData = [
    // الحقائب والأحذية
    [
      1, 1, 'حقيبة ظهر جلدية سوداء',
      'حقيبة ظهر جلدية فاخرة ومقاومة للماء، مناسبة للعمل والجامعة بتصميم عصري وأنيق تتسع لحاسوب محمول قياس 15 بوصة مع جيوب متعددة.',
      180, 220, '/images/bag-black.svg', 1
    ],
    [
      2, 1, 'حقيبة ظهر جلدية بنية',
      'حقيبة ظهر مصنوعة من الجلد الطبيعي بلون بني كلاسيكي، متعددة الاستخدامات مع بطانة داخلية واقية وسحابات متينة.',
      195, 240, '/images/bag-brown.svg', 1
    ],
    [
      3, 1, 'حقيبة سفر بعجلات خفيفة',
      'حقيبة سفر ذات سعة كبيرة ومزودة بأربع عجلات تدور 360 درجة، قفل أمان رقمي، وهيكل صلب مقاوم للصدمات.',
      320, 380, '/images/suitcase.svg', 1
    ],
    [
      4, 1, 'حذاء رياضي مريح للجري',
      'حذاء رياضي خفيف الوزن بنعل مرن ممتص للصدمات يوفر تهوية ممتازة وراحة قصوى أثناء الجري والمشي الطويل.',
      140, 175, '/images/shoe-sport.svg', 1
    ],
    [
      5, 1, 'حذاء جلدي رسمي أسود',
      'حذاء رجالي رسمي مصنوع من الجلد الطبيعي المصقول، مناسب للمناسبات الرسمية واجتماعات العمل.',
      210, 260, '/images/shoe-formal.svg', 1
    ],
    [
      6, 1, 'حذاء كاجوال خفيف رمادي',
      'حذاء كاجوال يومي عملي ومريح بتصميم أنيق يلائم الإطلالات اليومية والعمل الميداني.',
      120, 150, '/images/shoe-casual.svg', 1
    ],

    // الإلكترونيات والهواتف
    [
      7, 2, 'هاتف ذكي برو 256 جيجابايت',
      'هاتف ذكي متطور بشاشة أوليد فائقة الوضوح، معالج ثماني النواة عالي السرعة، كاميرا احترافية بدقة 108 ميجابكسل وبطارية تدوم طوال اليوم.',
      850, 950, '/images/phone-pro.svg', 1
    ],
    [
      8, 2, 'هاتف ذكي الترا أسود 128 جيجابايت',
      'هاتف ذكي عصري بتصميم نحيف وشاشة مريحة للعين، يدعم شبكات الجيل الخامس وشحن سريع 67 واط.',
      650, 720, '/images/phone-ultra.svg', 1
    ],
    [
      9, 2, 'حاسوب محمول للأعمال خفيف الوزن',
      'حاسوب محمول فائق النحافة بمعالج إنتل كور آي 7، ذاكرة 16 جيجابايت وسعة تخزين 512 جيجابايت، مثالي للمحترفين والطلاب.',
      1150, 1300, '/images/laptop-business.svg', 1
    ],
    [
      10, 2, 'حاسوب محمول للألعاب عالي الأداء',
      'لابتوب جيمينج قوي مجهز ببطاقة رسوميات متقدمة وشاشة بمعدل تحديث 144 هرتز لتجربة ألعاب سلسة وغامرة.',
      1550, 1800, '/images/laptop-gaming.svg', 1
    ],
    [
      11, 2, 'سماعة رأس لاسلكية عازلة للضوضاء',
      'سماعة رأس بلوتوث بصوت عالي الدقة وتقنية إلغاء الضوضاء النشطة، بطارية تعمل حتى 35 ساعة متواصلة ووسائد أذن مريحة.',
      240, 290, '/images/headphone.svg', 1
    ],
    [
      12, 2, 'سماعة أذن لاسلكية رياضية مقاومة للتعرق',
      'سماعات داخل الأذن مدمجة مع علبة شحن ذكية، مقاومة للماء والتعرق بمعيار IPX5، توفر عزل صوتي ونقاء استثنائي.',
      130, 160, '/images/earbuds.svg', 1
    ],
    [
      13, 2, 'ساعة يد ذكية مقاومة للماء',
      'ساعة ذكية متكاملة لتتبع اللياقة البدنية والنبض والنوم، مزودة بنظام تحديد المواقع وشاشة تعمل باللمس قابلة للتخصيص.',
      190, 230, '/images/smartwatch.svg', 1
    ],

    // الأثاث والمفروشات
    [
      14, 3, 'أريكة كلاسيكية مريحة رمادية',
      'أريكة قماشية وثيرة لثلاثة مقاعد مع وسائد إضافية وإطار خشبي متين، تضفي لمسة من الدفء والأناقة على غرفة المعيشة.',
      550, 650, '/images/sofa-grey.svg', 1
    ],
    [
      15, 3, 'أريكة جلدية عصرية بنية',
      'أريكة فاخرة من الجلد الفاخر بتصميم مودرن، سهلة التنظيف وتتحمل الاستخدام المكثف بجودة عالية.',
      780, 900, '/images/sofa-leather.svg', 1
    ],
    [
      16, 3, 'منضدة قهوة خشبية مستديرة',
      'طاولة قهوة مصنوعة من خشب البلوط الطبيعي بتشطيب دافئ وأرجل معدنية أنيقة، تتناسب مع الديكورات العصرية.',
      160, 200, '/images/coffee-table.svg', 1
    ],
    [
      17, 3, 'طاولة طعام خشبية لستة أفراد',
      'طاولة طعام مستطيلة واسعة مصنوعة من الخشب الصلب المقاوم للخدش، مصممة للمنازل العائلية بتناغم كلاسيكي.',
      620, 750, '/images/dining-table.svg', 1
    ],
    [
      18, 3, 'كرسي مكتب طبي مريح قابل للتعديل',
      'كرسي مريح مصمم لدعم الظهر والفقرات القطنية أثناء ساعات العمل الطويلة، مزود بمساند أذرع قابلة للضبط.',
      220, 270, '/images/office-chair.svg', 1
    ],

    // الملابس والأزياء
    [
      19, 4, 'قميص قطني أبيض كاجوال',
      'قميص قطن طبيعي 100% مريح وجيد التهوية بقصة عصرية ملائمة لمختلف المناسبات اليومية وغير الرسمية.',
      45, 60, '/images/shirt-white.svg', 1
    ],
    [
      20, 4, 'سروال جينز أزرق كلاسيكي',
      'سروال جينز عالي الجودة بقماش مرن وتفصيل مستقيم متناسق مع مختلف القمصان والأحذية.',
      70, 90, '/images/jeans-blue.svg', 1
    ],
    [
      21, 4, 'سترة شتوية دافئة مقاومة للماء',
      'جاكيت شتوي سميك مبطن بالريش الاصطناعي مع قبعة قابلة للفصل وسحابات عازلة للهواء البارد والمطر.',
      175, 220, '/images/jacket-winter.svg', 1
    ],

    // الأجهزة المنزلية
    [
      22, 5, 'ثلاجة ذكية ببابين ستانلس ستيل',
      'ثلاجة موفرة للطاقة بنظام تبريد مانع للتجمد، وشاشة لمس للتحكم بدرجة الحرارة وموزع ماء بارد مدمج.',
      950, 1150, '/images/fridge.svg', 1
    ],
    [
      23, 5, 'غسالة ملابس أوتوماتيكية 10 كجم',
      'غسالة ذكية ببرامج غسيل متعددة ومحرك دفع مباشر هادئ مع خاصية التنظيف بالبخار لتوفير عناية فائقة بالملابس.',
      680, 800, '/images/washing-machine.svg', 1
    ],
    [
      24, 5, 'ماكينة تحضير قهوة إسبريسو منزلية',
      'ماكينة قهوة احترافية بمضخة ضغط 15 بار وأنبوب تبخير حليب لصنع الكابتشينو واللاتيه بنكهة المقهى.',
      210, 260, '/images/coffee-maker.svg', 1
    ]
  ];

  for (const prod of productsData) {
    insertProduct.run(...prod);
  }

  // 4. Seed Product Attribute Values
  const insertAttrVal = db.prepare('INSERT INTO product_attribute_values (product_id, attribute_id, value) VALUES (?, ?, ?)');
  const attrValuesData = [
    // حقيبة ظهر جلدية سوداء
    [1, 1, 'أسود'], [1, 2, 'كبير'], [1, 5, 'جلد طبيعي'],
    // حقيبة ظهر جلدية بنية
    [2, 1, 'بني'], [2, 2, 'متوسط'], [2, 5, 'جلد طبيعي'],
    // حقيبة سفر بعجلات
    [3, 1, 'كحلي'], [3, 2, 'كبير'], [3, 3, 'بعجلات'],
    // حذاء رياضي
    [4, 1, 'أبيض'], [4, 2, '42'], [4, 3, 'رياضي'],
    // حذاء رسمي
    [5, 1, 'أسود'], [5, 2, '43'], [5, 3, 'رسمي'], [5, 5, 'جلد'],
    // حذاء كاجوال
    [6, 1, 'رمادي'], [6, 2, '41'], [6, 3, 'كاجوال'],
    // هاتف برو
    [7, 1, 'أزرق'], [7, 4, '256 جيجابايت'],
    // هاتف الترا
    [8, 1, 'أسود'], [8, 4, '128 جيجابايت'],
    // لابتوب أعمال
    [9, 1, 'فضي'], [9, 3, 'أعمال'], [9, 4, '512 جيجابايت'],
    // لابتوب جيمينج
    [10, 1, 'أسود'], [10, 3, 'ألعاب'], [10, 4, '1 تيرابايت'],
    // سماعة رأس
    [11, 1, 'أسود'], [11, 3, 'لاسلكي'],
    // سماعة أذن
    [12, 1, 'أبيض'], [12, 3, 'لاسلكي رياضية'],
    // ساعة ذكية
    [13, 1, 'أسود'], [13, 3, 'مقاومة للماء'],
    // أريكة رمادية
    [14, 1, 'رمادي'], [14, 2, '3 مقاعد'], [14, 5, 'قماش'],
    // أريكة بنية
    [15, 1, 'بني'], [15, 2, '3 مقاعد'], [15, 5, 'جلد'],
    // منضدة قهوة
    [16, 1, 'خشبي'], [16, 5, 'خشب بلوط'],
    // طاولة طعام
    [17, 1, 'خشبي'], [17, 2, '6 أفراد'], [17, 5, 'خشب صلب'],
    // كرسي مكتب
    [18, 1, 'أسود'], [18, 3, 'طبي مريح'],
    // قميص كاجوال
    [19, 1, 'أبيض'], [19, 2, 'L'], [19, 5, 'قطن'],
    // سروال جينز
    [20, 1, 'أزرق'], [20, 2, '32'], [20, 5, 'جينز'],
    // سترة شتوية
    [21, 1, 'كحلي'], [21, 2, 'XL'], [21, 3, 'مقاوم للماء'],
    // ثلاجة
    [22, 1, 'فضي'], [22, 4, '18 قدم'], [22, 5, 'ستانلس ستيل'],
    // غسالة
    [23, 1, 'أبيض'], [23, 4, '10 كجم'], [23, 3, 'أوتوماتيك'],
    // ماكينة قهوة
    [24, 1, 'أسود'], [24, 3, 'إسبريسو 15 بار']
  ];

  for (const av of attrValuesData) {
    insertAttrVal.run(...av);
  }

  // 5. Seed Commercial Lexicon Entries (Table 3.3, 11.3)
  const insertLex = db.prepare(`
    INSERT INTO lexicon_entries (term, normalized_term, canonical_term, relation_type)
    VALUES (?, ?, ?, ?)
  `);

  const lexiconData = [
    // Subsitution (استبدال: عامي/دارج أو أجنبي -> المصطلح المعتمد)
    { term: 'شنطة ظهر', canonical: 'حقيبة ظهر', type: 'substitution' },
    { term: 'شنطة سفر', canonical: 'حقيبة سفر', type: 'substitution' },
    { term: 'شنطة كتف', canonical: 'حقيبة كتف', type: 'substitution' },
    { term: 'شنطة', canonical: 'حقيبة', type: 'substitution' },
    { term: 'شنط', canonical: 'حقائب', type: 'substitution' },
    { term: 'شنطه', canonical: 'حقيبه', type: 'substitution' },
    
    { term: 'جزمة رياضية', canonical: 'حذاء رياضي', type: 'substitution' },
    { term: 'جزمة رسمية', canonical: 'حذاء رسمي', type: 'substitution' },
    { term: 'جزمة', canonical: 'حذاء', type: 'substitution' },
    { term: 'جزم', canonical: 'أحذية', type: 'substitution' },
    { term: 'كوتشي', canonical: 'حذاء رياضي', type: 'substitution' },
    { term: 'شوز', canonical: 'حذاء', type: 'substitution' },

    { term: 'موبايل', canonical: 'هاتف ذكي', type: 'substitution' },
    { term: 'جوال', canonical: 'هاتف ذكي', type: 'substitution' },
    { term: 'تلفون', canonical: 'هاتف ذكي', type: 'substitution' },
    { term: 'تليفون', canonical: 'هاتف ذكي', type: 'substitution' },

    { term: 'لابتوب', canonical: 'حاسوب محمول', type: 'substitution' },
    { term: 'كمبيوتر محمول', canonical: 'حاسوب محمول', type: 'substitution' },
    { term: 'كمبيوتر', canonical: 'حاسوب', type: 'substitution' },

    { term: 'هيدفون', canonical: 'سماعة رأس', type: 'substitution' },
    { term: 'ايربودز', canonical: 'سماعة أذن', type: 'substitution' },
    { term: 'سماعات بلوتوث', canonical: 'سماعة لاسلكية', type: 'substitution' },

    { term: 'براد', canonical: 'ثلاجة', type: 'substitution' },
    { term: 'فريزر', canonical: 'ثلاجة', type: 'substitution' },
    { term: 'غسالة ملابس', canonical: 'غسالة', type: 'substitution' },

    { term: 'تيشيرت', canonical: 'قميص قطني', type: 'substitution' },
    { term: 'بنطلون', canonical: 'سروال', type: 'substitution' },
    { term: 'بنطال', canonical: 'سروال', type: 'substitution' },
    { term: 'جاكيت', canonical: 'سترة', type: 'substitution' },

    // Equivalence (تكافؤ: علاقة تبادلية بين مصطلحين معتمدين كلاهما مستخدم في البيانات)
    { term: 'كنبة', canonical: 'أريكة', type: 'equivalence' },
    { term: 'أريكة', canonical: 'كنبة', type: 'equivalence' },
    { term: 'طاولة', canonical: 'منضدة', type: 'equivalence' },
    { term: 'منضدة', canonical: 'طاولة', type: 'equivalence' },
    { term: 'سترة', canonical: 'جاكيت', type: 'equivalence' },
    { term: 'جاكيت', canonical: 'سترة', type: 'equivalence' }
  ];

  for (const item of lexiconData) {
    const normTerm = NormalizationService.normalize(item.term);
    const normCanonical = NormalizationService.normalize(item.canonical);
    insertLex.run(item.term, normTerm, normCanonical, item.type);
  }

  console.log(`Seeded: ${categoriesData.length} categories, ${productsData.length} products, ${lexiconData.length} lexicon entries.`);
  console.log('--- Database Seeding Completed ---');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
