import UserFactory from './src/models/User.js';
import Sequelize from 'sequelize';

console.log('Imported UserFactory:', UserFactory);

const sequelize = new Sequelize('sqlite::memory:'); // Dummy sequelize
const User = UserFactory(sequelize, Sequelize.DataTypes);

console.log('Initialized User:', User);
