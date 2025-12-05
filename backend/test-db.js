import bd from './src/models/index.js';

async function testConnection() {
    try {
        console.log('Tentando conectar ao banco de dados...');
        await bd.sequelize.authenticate();
        console.log('Conexão estabelecida com sucesso.');
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
    } finally {
        await bd.sequelize.close();
    }
}

testConnection();
