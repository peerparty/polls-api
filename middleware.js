const posts = require('./posts')

exports.auth = (req, res, next) => {
  if(!req.session.user) {
    res.status(403).json({ 'msg': 'Unauthorized'})
  } else {
    posts.unlockAccount(req.session.addr, req.session.pwd)
    next()
  } 
}

