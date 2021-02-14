const posts = require('./posts'),
  creds = require('../creds').creds,
  contractAddr = require('../address').contractAddress

function fail(req, res, err) {
  console.error(err.stack)  
  res.status(500).json({ 'msg': 'Server error' })
}

exports.getUser = async (req, res) => {
  req.session.balance = await posts.getBalance(req.session.addr)
  res.json({user: req.session.user, balance: req.session.balance})
}

exports.login = async (req, res) => {
  if(creds[req.body.name].pwd == req.body.pwd) {
    req.session.user = req.body.name
    req.session.auth = true
    req.session.addr = creds[req.body.name].addr
    req.session.pwd = req.body.pwd
    req.session.balance = await posts.getBalance(req.session.addr)
    req.session.contractAddr = req.body.contract || contractAddr
    posts.unlockAccount(req.session.addr, req.body.pwd)
    res.json({user: req.session.user, balance: req.session.balance})
  } else res.status(403).json({ 'msg': 'Unauthorized'})
}

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if(err) fail(req, res, err)
    else res.json({ 'msg': 'Success' })
  })
}

exports.createAccount = async (req, res) => {
  try {
    const a = await posts.createAccount(req.body.pwd)
    res.json(a)
  } catch(err) { fail(req, res, err) }
}

exports.postPosts = async (req, res) => {
  try {
    await posts.addPost(
      req.body.title,
      req.body.description,
      req.session.addr,
      req.session.contractAddr)
    res.json({ 'msg': 'Post created.' })
  } catch(err) { fail(req, res, err) }
}

exports.getPosts = async (req, res) => {
  try {
    res.json(await posts.getPosts(req.session.addr, req.session.contractAddr))
  } catch(err) { fail(req, res, err) }
}

exports.getPost = async (req, res) => {
  try {
    res.json(await posts.getPost(
      req.params.id,
      req.session.addr,
      req.session.contractAddr
    ))
  } catch(err) { fail(req, res, err) }
}

exports.postPostVotes = async (req, res) => {
  try {
    await posts.votePost(
      req.params.id,
      req.body.up === 'true',
      req.session.addr,
      req.session.contractAddr)
    res.json({ 'msg': 'Vote received.' })
  } catch(err) { fail(req, res, err) }
}

exports.postPostComments = async (req, res) => {
  console.log(req.params.id, req.body.comment)
  try {
    await posts.commentPost(
      req.params.id,
      req.body.comment, 
      req.session.addr,
      req.session.contractAddr)
    res.json({ 'msg': 'Comment received.' })
  } catch(err) { fail(req, res, err) }
}

exports.postCommentVotes = async (req, res) => {
  try {
    await posts.voteComment(
      req.params.id,
      req.body.up === 'true', 
      req.session.addr,
      req.session.contractAddr)
    res.json({ 'msg': 'Vote received.'})
  } catch(err) { fail(req, res, err) }
}

exports.postCommentComments = async (req, res) => {
  try {
    await posts.commentComment(
      req.params.id,
      req.body.comment,
      req.session.addr,
      req.session.contractAddr)
    res.json({ 'msg': 'Comment received.'})
  } catch(err) { fail(req, res, err) }
}

