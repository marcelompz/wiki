import { PrismaService } from '../../common/prisma.service';
import * as http from 'http';

// Este script corre fuera del contexto de inyección de dependencias de Nest
// (es un CLI standalone), por lo que no existe `this.prisma`. Se instancia
// PrismaService en vez de PrismaClient directo para respetar la Regla de
// Arquitectura "Prohibido Instanciar PrismaClient Directamente" de AGENTS.md
// — PrismaService es un envoltorio 1:1 sobre PrismaClient, así que el
// comportamiento no cambia.
const prisma = new PrismaService();

function httpGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function httpPost(url: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          resolve(responseData);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function migrate() {
  console.log('🔄 Starting WhatsApp -> Social Catalog migration (standalone)...');

  const installations = await prisma.moduleInstallation.findMany({
    where: {
      moduleId: 'whatsapp-catalog',
      active: true,
    },
  });

  console.log(`📦 Found ${installations.length} active whatsapp-catalog installations`);

  const standaloneUrl = process.env.SOCIAL_CATALOG_STANDALONE_URL || 'http://localhost:3021';

  for (const installation of installations) {
    const config = (installation.config || {}) as Record<string, any>;
    const whatsappNumber = config.whatsappNumber as string | undefined;

    console.log(`\n🔍 Tenant: ${installation.tenantId}`);
    console.log(`   whatsappNumber: ${whatsappNumber || '(none)'}`);

    if (!whatsappNumber) {
      console.log('   ⚠️  No whatsappNumber found, skipping channel creation');
      continue;
    }

    const existingChannels = await httpGet(`${standaloneUrl}/api/v1/standalone/social-catalog/channels`);

    const existingChannel = Array.isArray(existingChannels)
      ? existingChannels.find((ch: any) => ch.tenantId === installation.tenantId && ch.channel === 'WHATSAPP')
      : null;

    if (existingChannel) {
      console.log('   ℹ️  WHATSAPP channel already exists, updating...');
      await httpPost(`${standaloneUrl}/api/v1/standalone/social-catalog/channels/${existingChannel.id}`, {
        phoneNumber: whatsappNumber,
        active: true,
        isDefault: true,
        config,
      });
    } else {
      console.log('   ✅ Creating WHATSAPP channel config');
      await httpPost(`${standaloneUrl}/api/v1/standalone/social-catalog/channels`, {
        tenantId: installation.tenantId,
        channel: 'WHATSAPP',
        phoneNumber: whatsappNumber,
        active: true,
        isDefault: true,
        config,
      });
    }

    await prisma.moduleInstallation.update({
      where: { id: installation.id },
      data: { moduleId: 'social-catalog' },
    });

    console.log('   ✅ ModuleInstallation updated to social-catalog');
  }

  console.log('\n🎉 Migration completed successfully');
}

migrate()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
