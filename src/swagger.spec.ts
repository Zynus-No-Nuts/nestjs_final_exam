import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('Swagger OpenAPI Specification', () => {
  it('generates a complete OpenAPI document covering all E-commerce modules', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: vi.fn(),
        onModuleDestroy: vi.fn(),
      })
      .compile();

    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    const config = new DocumentBuilder()
      .setTitle('E-Commerce Backend API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'refresh-token')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    const paths = Object.keys(document.paths);

    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/v1/auth/register',
        '/api/v1/auth/login',
        '/api/v1/auth/refresh',
        '/api/v1/auth/logout',
        '/api/v1/users/profile',
        '/api/v1/users/addresses',
        '/api/v1/categories',
        '/api/v1/products',
        '/api/v1/products/{id}/stock',
        '/api/v1/cart',
        '/api/v1/cart/items',
        '/api/v1/orders/checkout',
        '/api/v1/orders/{id}/cancel',
        '/api/v1/orders/{id}/status',
        '/api/v1/payments/methods',
        '/api/v1/payments/orders/{orderId}/pay',
      ]),
    );

    await app.close();
  });
});
