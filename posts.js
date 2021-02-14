const Web3 = require('web3'),
  fs = require('fs'),
  config = require('../config').config

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
const source = fs.readFileSync("../consensus.json")
const contracts = JSON.parse(source)["contracts"]
const abi =contracts["consensus.sol:Posts"].abi
const contract = new web3.eth.Contract(abi, config.contract)

// make a call to a contract
async function exec(addr, call, desc) {
    let gas = await call.estimateGas({from: addr}) * 10
    let atx = call.send({from: addr, gas: gas})
    console.log(`sent ${call._method.name} with gas ${gas}`)

    let result = await atx
    console.log(desc, result.status ? `SUCCESS` : "FAIL")
}

exports.getBalance = async addr => {
  let b = await web3.eth.getBalance(addr)
  return web3.utils.fromWei(`${b}`, 'ether')
}

<<<<<<< HEAD
exports.deployContract = async (addr) => {
  const source = fs.readFileSync("../consensus.json")
  const contracts = JSON.parse(source)["contracts"]
  const abi = JSON.parse(contracts["consensus.sol:Posts"].abi)
  const code = '0x' + contracts["consensus.sol:Posts"].bin
  const contract = new web3.eth.Contract(abi, null, { data: code })
  const contractDeploy = contract.deploy()
  const gasPrice = await web3.eth.getGasPrice()
  const gas = await contractDeploy.estimateGas({ from: addr })
  const instance = await contractDeploy.send({
    from: addr,
    gasPrice: gasPrice,
    gas: gas
  })
  return instance.options.address
}

exports.addPost = async (title, description, addr, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  const addPost = contract.methods.addPost(title, description)
  const gas = await addPost.estimateGas({from: addr})
  console.log("addPost gas: " + gas)
  const tx = await addPost.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Post added." : "Tx FAILED.")
  return tx.status
=======
exports.addPost = async (title, description, addr) => {
  return await exec(addr, contract.methods.addPost(title, description), "Post added")
>>>>>>> 8a5e2755635b756fba3185f9671776c414ffcfad
}

exports.countPosts = async (addr, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  const c = await contract.methods.postCount().call({from: addr})
  console.log("# Posts: " + c)
  return c
}

async function getComment(commentId, addr, contractAddr) {
  const contract = new web3.eth.Contract(abi, contractAddr)
  let comment = await contract.methods.comments(commentId).call({from: addr})
  
  const commentVotes = await contract.methods.getCommentVotes(commentId).call({from: addr})
  for(let k = 0; k < commentVotes.length; k++) {
    const voteIndex = commentVotes[k]
    const vote = await contract.methods.votes(voteIndex).call({from: addr})
    if(comment.votes && !vote.changed) comment.votes.push(vote)
    else if(!vote.changed) comment.votes = [ vote ]
  }
  comment.consensus = getConsensus(comment)

  const commentComments = await contract.methods.getCommentComments(commentId).call({from: addr})
  for(let k = 0; k < commentComments.length; k++) {
<<<<<<< HEAD
    const commentIndex = commentComments[k]
    const comments = await getComment(commentComments[k], addr, contractAddr)
=======
    const comments = await getComment(commentComments[k])
>>>>>>> 8a5e2755635b756fba3185f9671776c414ffcfad
    if(comment.comments) comment.comments.push(comments)
    else comment.comments = [ comments ]
  }

  return comment
}

exports.getComment = async (commentId, contractAddr) => {
  return await getComment(commentId, contractAddr)
}

function getConsensus(obj) {
  if(obj.votes) {
    const votes = obj.votes.filter(v => !v.changed)
    console.log(votes)
    const up = votes.reduce((c, v) => (v.up ? c + 1 : c), 0)
    const down = votes.reduce((c, v) => (!v.up ? c + 1 : c), 0)
    console.log("UP/DOWN", up, down,  (up > 1 && down === 0) || (down > 1 && up === 0))
    const c = (up > 1 && down === 0) || (down > 1 && up === 0)
    console.log("CONSENSUS", obj.comment ? obj.comment : "POST", c)
    return c
  } else {
    console.log("No consensus")
    return false
  }
}

function aggregateConsensus(obj, a) {
  if(getConsensus(obj)) a = [...a, [obj[0], obj[1], obj[2]]]
  if(obj.comments) a = obj.comments.reduce((a, c) => aggregateConsensus(c, a), a)
  return a
}

function getCommentsCount(obj) {
  return obj.comments ? obj.comments.reduce((count, comment) => count + getCommentsCount(comment), obj.comments.length) : 0
}

function getVotesCount(obj) {
  const votesCount = obj.votes ? obj.votes.length : 0
  return obj.comments ? obj.comments.reduce((count, comment) => count + getVotesCount(comment), votesCount) : votesCount
}

async function getPost(postId, addr, contractAddr) {
  console.log("GET POST", contractAddr)
  const contract = new web3.eth.Contract(abi, contractAddr)
  let post = await contract.methods.posts(postId).call({from: addr})
  const postVotes = await contract.methods.getPostVotes(postId).call({from: addr})
  for(let j = 0; j < postVotes.length; j++) {
    const voteIndex = postVotes[j]
    const vote = await contract.methods.votes(voteIndex).call({from: addr})
    if(post.votes && !vote.changed) post.votes.push(vote)
    else if(!vote.changed) post.votes = [ vote ]
  }

  post.consensus = getConsensus(post)

  const postComments = await contract.methods.getPostComments(postId).call({from: addr})
  for(let j = 0; j < postComments.length; j++) {
    const comment = await getComment(postComments[j], addr, contractAddr)
    if(post.comments) post.comments.push(comment)
    else post.comments = [ comment ]
  }

  post.commentsCount = getCommentsCount(post)
  post.votesCount = getVotesCount(post)

  post.moments = aggregateConsensus(post, [])

  return post
}

exports.getPost = async (postId, addr, contractAddr) => {
  console.log("EXPORT GET POST", contractAddr)
  return await getPost(postId, addr, contractAddr)
}

exports.getPosts = async (addr, contractAddr) => {
  console.log("GET POSTS", contractAddr)
  const contract = new web3.eth.Contract(abi, contractAddr)
  const c = await contract.methods.postCount().call({from: addr})
  let posts = []
  for(let i = 0; i < c; i++) {
    posts.push(await getPost(i, addr, contractAddr))
  }

  return posts
}

<<<<<<< HEAD
exports.votePost = async (postId, up, addr, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  const addVote = contract.methods.addVote(postId, up)
  const gas = await addVote.estimateGas({from: addr})
  console.log("addVote gas: " + gas)
  const tx = await addVote.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Vote added." : "Tx FAILED.")
  return tx.status
}

exports.commentPost = async (postId, comment, addr, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  const addComment = contract.methods.addComment(postId, comment)
  const gas = await addComment.estimateGas({from: addr})
  console.log("addComment gas: " + gas)
  const tx = await addComment.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Comment added." : "Tx FAILED.")
  return tx.status
}

exports.voteComment = async (commentId, up, addr, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  const addCommentVote = contract.methods.addCommentVote(commentId, up)
  const gas = await addCommentVote.estimateGas({from: addr})
  console.log("addCommentVote gas: " + gas)
  const tx = await addCommentVote.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Voted on comment." : "Tx FAILED.")
  return tx.status
}

exports.commentComment = async (commentId, comment, addr, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  const addCommentComment = contract.methods.addCommentComment(commentId, comment)
  const gas = await addCommentComment.estimateGas({from: addr})
  console.log("addCommentComment gas: " + gas)
  const tx = await addCommentComment.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Commented on comment." : "Tx FAILED.")
  return tx.status
=======
exports.votePost = async (postId, up, addr) => {
  return await exec(addr, contract.methods.addVote(postId, up), "Vote added")
}

exports.commentPost = async (postId, comment, addr) => {
  return await exec(addr, contract.methods.addComment(postId, comment), "Comment added")
}

exports.voteComment = async (commentId, up, addr) => {
  return await exec(addr, contract.methods.addCommentVote(commentId, up), "Voted on comment")
}

exports.commentComment = async (commentId, comment, addr) => {
  return await exec(addr, contract.methods.addCommentComment(commentId, comment), "Commented on comment")
>>>>>>> 8a5e2755635b756fba3185f9671776c414ffcfad
}

async function _sendFunds(account) {
  const coinbase = await web3.eth.getCoinbase()
  return await web3.eth.sendTransaction({
    from: coinbase,
    to: account,
    value: web3.utils.toWei("1.0", "ether")
  })
}

exports.createAccount = async password => {
  const a = await web3.eth.personal.newAccount(password)
  await _sendFunds(a)
  return a
}

exports.unlockAccount = (addr, password) => { 
  web3.eth.personal.unlockAccount(addr, password)
}

