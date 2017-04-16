import bcrypt from 'bcrypt';
import passport from 'passport';
import { User, Comment, Post } from '../models';

const isEmptyOrNull = string => {
  return !string || !string.trim();
};

const getUserProps = user => {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

module.exports = {
  async create(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    const verify = req.body.verify;

    if (
      isEmptyOrNull(username) ||
      isEmptyOrNull(password) ||
      isEmptyOrNull(verify)
    ) {
      return res.status(500).send({
        message: 'Please fill out all fields.',
      });
    }

    if (password !== verify) {
      return res.status(500).send({
        message: 'Your passwords do not match.',
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    try {
      const user = await User.create({
        username: username.toLowerCase(),
        salt: salt,
        password: hash,
      });

      return req.login(user, err => {
        if (!err) {
          return res.status(200).send(getUserProps(user));
        }

        return res.status(500).send({
          message: 'Auth error',
        });
      });
    } catch (err) {
      return res.status(500).send(err);
    }
  },

  auth(req, res) {
    return passport.authenticate('local', (err, user, info) => {
      if (err) {
        return res.status(500).send({
          message: '500: Authentication failed, try again.',
        });
      }

      if (!user) {
        return res.status(404).send({
          message: '404: Authentication failed, try again.',
        });
      }

      req.login(user, err => {
        if (!err) {
          res.status(200).send(user);
        }
      });
    })(req, res);
  },

  logout(req, res) {
    req.logout();
    return res.status(200).send({
      message: 'You are successfully logged out',
    });
  },

  async list(req, res) {
    try {
      const users = await User.findAll({
        attributes: {
          exclude: ['salt', 'password'],
        },
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).send(users);
    } catch (err) {
      return res.status(500).send(err);
    }
  },

  async get(req, res) {
    try {
      const user = await User.findById(req.params.userId, {
        attributes: {
          exclude: ['salt', 'password'],
        },
        include: [
          {
            model: Post,
            as: 'posts',
          },
          {
            model: Comment,
            as: 'comments',
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      if (!user) {
        return res.status(404).send({
          message: '404 on user get',
        });
      }

      return res.status(200).send(getUserProps(user));
    } catch (err) {
      return res.status(500).send(err);
    }
  },

  async update(req, res) {
    if (isEmptyOrNull(req.body.password)) {
      return res.status(500).send({
        message: 'You must provide a password.',
      });
    }

    try {
      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).send({
          message: '404 no user on update',
        });
      }

      const updatedUser = await user.update({
        email: req.body.email || user.email,
        username: req.body.username || user.username,
        password: req.body.password || user.password,
      });

      return res.status(200).send(getUserProps(updatedUser));
    } catch (err) {
      return res.status(500).send(err);
    }
  },

  async deleteViewer(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(403).send({
          message: 'Forbidden: User Not Found',
        });
      }

      req.logout();
      await user.destroy();

      return res.status(200).send({
        viewer: null,
      });
    } catch (err) {
      return res.status(500).send(err);
    }
  },
};