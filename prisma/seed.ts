import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

try {
  process.loadEnvFile?.();
} catch {
  // .env may already be loaded by Prisma CLI or environment variables
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding E-commerce database...');

  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@ecommerce.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';
  const saltRounds = 10;

  const [adminPasswordHash, customerPasswordHash] = await Promise.all([
    bcrypt.hash(adminPassword, saltRounds),
    bcrypt.hash('Customer@123456', saltRounds),
  ]);

  // 1. Seed default Admin & sample Customer
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      username: adminUsername,
      fullName: 'System Administrator',
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      username: adminUsername,
      email: adminEmail,
      password: adminPasswordHash,
      fullName: 'System Administrator',
      phone: '0900000001',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@ecommerce.local' },
    update: {
      username: 'customer',
      fullName: 'user_c01a9f',
      role: Role.CUSTOMER,
      isActive: true,
    },
    create: {
      username: 'customer',
      email: 'customer@ecommerce.local',
      password: customerPasswordHash,
      fullName: 'user_c01a9f',
      phone: '0901234567',
      role: Role.CUSTOMER,
      isActive: true,
      addresses: {
        create: {
          recipientName: 'Nguyen Van A',
          phone: '0901234567',
          street: '123 Le Loi Street',
          ward: 'Ben Nghe Ward',
          district: 'District 1',
          city: 'Ho Chi Minh City',
          country: 'Vietnam',
          postalCode: '700000',
          isDefault: true,
        },
      },
      cart: {
        create: {},
      },
    },
  });

  console.log(`Users ready: admin=${admin.email}, customer=${customer.email}`);

  // 2. Seed parent & child Categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: { name: 'Electronics', description: 'Consumer electronics and smart devices' },
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Consumer electronics and smart devices',
    },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: 'fashion' },
    update: { name: 'Fashion', description: 'Apparel, footwear, and lifestyle accessories' },
    create: {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Apparel, footwear, and lifestyle accessories',
    },
  });

  const [smartphones, laptops, audio, smartwatches, sneakers, apparel] = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'smartphones' },
      update: { name: 'Smartphones', parentId: electronics.id },
      create: {
        name: 'Smartphones',
        slug: 'smartphones',
        description: 'Flagship and mid-range smartphones',
        parentId: electronics.id,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'laptops' },
      update: { name: 'Laptops', parentId: electronics.id },
      create: {
        name: 'Laptops',
        slug: 'laptops',
        description: 'Ultrabooks, workstations, and gaming laptops',
        parentId: electronics.id,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'audio' },
      update: { name: 'Audio', parentId: electronics.id },
      create: {
        name: 'Audio',
        slug: 'audio',
        description: 'Wireless headphones, earbuds, and speakers',
        parentId: electronics.id,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'smartwatches' },
      update: { name: 'Smartwatches', parentId: electronics.id },
      create: {
        name: 'Smartwatches',
        slug: 'smartwatches',
        description: 'Fitness trackers and flagship smartwatches',
        parentId: electronics.id,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'sneakers' },
      update: { name: 'Sneakers', parentId: fashion.id },
      create: {
        name: 'Sneakers',
        slug: 'sneakers',
        description: 'Running shoes and everyday sneakers',
        parentId: fashion.id,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'apparel-bags' },
      update: { name: 'Apparel & Bags', parentId: fashion.id },
      create: {
        name: 'Apparel & Bags',
        slug: 'apparel-bags',
        description: 'Everyday clothing, outerwear, and backpacks',
        parentId: fashion.id,
      },
    }),
  ]);

  // 3. Seed 21 sample Products with real product imagery
  const sampleProducts = [
    // --- Existing 6 products (upgraded with real images) ---
    {
      name: 'iPhone 16 Pro 256GB',
      slug: 'iphone-16-pro-256gb',
      sku: 'SKU-IP16P-256',
      description: 'Titanium design, A18 Pro chip, 48MP Pro camera system.',
      price: '28990000.00',
      stock: 25,
      images: [
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: smartphones.id,
    },
    {
      name: 'Samsung Galaxy S25 Ultra 256GB',
      slug: 'samsung-galaxy-s25-ultra-256gb',
      sku: 'SKU-SGS25U-256',
      description: 'Dynamic AMOLED 2X display, integrated S Pen, 200MP camera.',
      price: '27490000.00',
      stock: 18,
      images: [
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: smartphones.id,
    },
    {
      name: 'MacBook Pro 14 M4 Pro 24GB/512GB',
      slug: 'macbook-pro-14-m4-pro-24-512',
      sku: 'SKU-MBP14-M4P',
      description: 'Apple M4 Pro chip, Liquid Retina XDR display, all-day battery life.',
      price: '49990000.00',
      stock: 10,
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: laptops.id,
    },
    {
      name: 'Dell XPS 13 OLED Core Ultra 7',
      slug: 'dell-xps-13-oled-ultra-7',
      sku: 'SKU-DXPS13-U7',
      description: 'CNC machined aluminum chassis with InfinityEdge OLED display.',
      price: '36500000.00',
      stock: 12,
      images: [
        'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: laptops.id,
    },
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      slug: 'sony-wh-1000xm5-wireless-headphones',
      sku: 'SKU-SONY-XM5',
      description: 'Industry-leading active noise cancellation with 30-hour battery.',
      price: '7990000.00',
      stock: 40,
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: audio.id,
    },
    {
      name: 'Nike Air Zoom Pegasus 41',
      slug: 'nike-air-zoom-pegasus-41',
      sku: 'SKU-NIKE-PEG41',
      description: 'Responsive ReactX foam cushioning for daily road running.',
      price: '3590000.00',
      stock: 50,
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: sneakers.id,
    },

    // --- 15 Additional Products ---
    {
      name: 'Google Pixel 9 Pro 256GB',
      slug: 'google-pixel-9-pro-256gb',
      sku: 'SKU-GP9P-256',
      description: 'Google Tensor G4, pro triple rear camera system, Super Actua display.',
      price: '24990000.00',
      stock: 16,
      images: [
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: smartphones.id,
    },
    {
      name: 'Xiaomi 15 Ultra 512GB',
      slug: 'xiaomi-15-ultra-512gb',
      sku: 'SKU-XM15U-512',
      description: 'Leica optical Summilux lens, Snapdragon 8 Elite, 90W HyperCharge.',
      price: '26990000.00',
      stock: 22,
      images: [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: smartphones.id,
    },
    {
      name: 'iPhone 16 128GB',
      slug: 'iphone-16-128gb',
      sku: 'SKU-IP16-128',
      description: 'A18 chip, Camera Control button, aerospace-grade aluminum enclosure.',
      price: '21490000.00',
      stock: 30,
      images: [
        'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: smartphones.id,
    },
    {
      name: 'MacBook Air 13 M3 16GB/256GB',
      slug: 'macbook-air-13-m3-16-256',
      sku: 'SKU-MBA13-M3',
      description: 'Ultra-thin fanless design, M3 chip, up to 18 hours of battery life.',
      price: '27990000.00',
      stock: 20,
      images: [
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: laptops.id,
    },
    {
      name: 'ASUS ROG Zephyrus G14 RTX 4070',
      slug: 'asus-rog-zephyrus-g14-rtx-4070',
      sku: 'SKU-ROG-G14',
      description: '14-inch 3K 120Hz OLED gaming ultrabook with AMD Ryzen 9 & RTX 4070.',
      price: '44990000.00',
      stock: 8,
      images: [
        'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: laptops.id,
    },
    {
      name: 'Lenovo ThinkPad X1 Carbon Gen 12',
      slug: 'lenovo-thinkpad-x1-carbon-gen-12',
      sku: 'SKU-TPX1C-G12',
      description: 'Featherweight carbon-fiber business laptop with legendary keyboard.',
      price: '41500000.00',
      stock: 14,
      images: [
        'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: laptops.id,
    },
    {
      name: 'Apple AirPods Pro 2 (USB-C)',
      slug: 'apple-airpods-pro-2-usb-c',
      sku: 'SKU-APP2-USBC',
      description: 'H2 chip, Adaptive Audio, Conversation Awareness, MagSafe USB-C case.',
      price: '5790000.00',
      stock: 45,
      images: [
        'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: audio.id,
    },
    {
      name: 'Bose QuietComfort Ultra Headphones',
      slug: 'bose-quietcomfort-ultra-headphones',
      sku: 'SKU-BOSE-QCU',
      description: 'Spatialized Immersive Audio with world-class noise cancellation.',
      price: '9490000.00',
      stock: 19,
      images: [
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: audio.id,
    },
    {
      name: 'JBL Charge 5 Portable Speaker',
      slug: 'jbl-charge-5-portable-speaker',
      sku: 'SKU-JBL-CHG5',
      description: 'IP67 waterproof & dustproof Bluetooth speaker with built-in powerbank.',
      price: '3690000.00',
      stock: 35,
      images: [
        'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: audio.id,
    },
    {
      name: 'Apple Watch Series 10 46mm GPS',
      slug: 'apple-watch-series-10-46mm-gps',
      sku: 'SKU-AWS10-46',
      description: 'Thinnest Apple Watch ever with wide-angle OLED and sleep apnea alerts.',
      price: '10990000.00',
      stock: 24,
      images: [
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: smartwatches.id,
    },
    {
      name: 'Garmin Forerunner 265 GPS Watch',
      slug: 'garmin-forerunner-265-gps-watch',
      sku: 'SKU-GARMIN-FR265',
      description: 'Bright AMOLED running smartwatch with multi-band GPS & training readiness.',
      price: '11290000.00',
      stock: 15,
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: smartwatches.id,
    },
    {
      name: 'Adidas Ultraboost Light Running',
      slug: 'adidas-ultraboost-light-running',
      sku: 'SKU-ADI-UBL',
      description: 'Lightest BOOST midsole ever with Primeknit+ breathable upper.',
      price: '4290000.00',
      stock: 32,
      images: [
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: sneakers.id,
    },
    {
      name: 'New Balance 574 Core Classic',
      slug: 'new-balance-574-core-classic',
      sku: 'SKU-NB-574',
      description: 'Iconic suede and mesh silhouette with ENCAP midsole cushioning.',
      price: '2690000.00',
      stock: 42,
      images: [
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: sneakers.id,
    },
    {
      name: 'Essential Heavyweight Cotton Hoodie',
      slug: 'essential-heavyweight-cotton-hoodie',
      sku: 'SKU-APP-HOOD01',
      description: '420gsm brushed French terry cotton hoodie with relaxed boxy fit.',
      price: '1290000.00',
      stock: 60,
      images: [
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: apparel.id,
    },
    {
      name: 'Urban Commuter 20L Laptop Backpack',
      slug: 'urban-commuter-20l-laptop-backpack',
      sku: 'SKU-BAG-UC20L',
      description: 'Water-resistant ballistic nylon backpack with padded 16-inch laptop sleeve.',
      price: '1850000.00',
      stock: 38,
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      ],
      categoryId: apparel.id,
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        images: product.images,
        categoryId: product.categoryId,
        isActive: true,
      },
      create: product,
    });
  }

  console.log(`Seeded ${sampleProducts.length} sample products across 8 categories.`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
