const prisma = require('./src/lib/prisma');
const crypto = require('crypto');

async function testLogin() {
  try {
    const email = 'supervisor@kavana.com';
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      console.log('Usuario no encontrado');
      return;
    }
    console.log('Usuario encontrado:', usuario);

    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const refreshToken = await prisma.refreshToken.create({
      data: {
        id_usuario: usuario.id_usuario,
        token,
        expires_at: expiresAt,
      },
    });

    console.log('RefreshToken creado:', refreshToken);
  } catch (error) {
    console.error('ERROR EN TEST LOGIN:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
