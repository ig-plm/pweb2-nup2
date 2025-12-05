import Sequelize from 'sequelize';
import configFile from '../config/config.js';
import UserFactory from './User.js';
import TaskFactory from './task.js';

const env = process.env.NODE_ENV || 'development';
const config = configFile[env];
const bd = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

const User = UserFactory(sequelize, Sequelize.DataTypes);
const Task = TaskFactory(sequelize, Sequelize.DataTypes);

bd.User = User;
bd.Task = Task;

Object.keys(bd).forEach(modelName => {
  if (bd[modelName].associate) {
    bd[modelName].associate(bd);
  }
});

bd.sequelize = sequelize;
bd.Sequelize = Sequelize;

export default bd;