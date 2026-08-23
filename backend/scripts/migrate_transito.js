const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('Running ALTER TABLE 1...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "campos_plantilla" ADD COLUMN IF NOT EXISTS "es_transito" BOOLEAN DEFAULT false;`);
    console.log('Running ALTER TABLE 2...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "campos_plantilla" ADD COLUMN IF NOT EXISTS "ente_superior_nombre" TEXT;`);
    console.log('Columns added successfully!');

    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'campos_plantilla' AND column_name IN ('es_transito', 'ente_superior_nombre');
    `);
    console.log('Verified columns:', cols);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
