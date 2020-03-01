const Web3 = require('web3'),
  fs = require('fs'),
  contractAddr = require('../address')

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
const source = fs.readFileSync("../consensus.json")
const contracts = JSON.parse(source)["contracts"]
const abi = JSON.parse(contracts["consensus.sol:Posts"].abi)
const contract = new web3.eth.Contract(abi, contractAddr.contractAddress)

exports.getBalance = async addr => {
  let b = await web3.eth.getBalance(addr)
  return web3.utils.fromWei(`${b}`, 'ether')
}

exports.addPost = async (title, description, addr) => {
  const addPost = contract.methods.addPost(title, description)
  const gas = await addPost.estimateGas()
  console.log("addPost gas: " + gas)
  const tx = await addPost.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Post added." : "Tx FAILED.")
  return tx.status
}

exports.countPosts = async () => {
  const c = await contract.methods.postCount().call()
  console.log("# Posts: " + c)
  return c
}

exports.getComment = async (commentId) => {
  let comment = await contract.methods.comments(commentId).call()
  
  const commentVotes = await contract.methods.getCommentVotes(commentId).call()
  for(let k = 0; k < commentVotes.length; k++) {
    const voteIndex = commentVotes[k]
    const vote = await contract.methods.votes(voteIndex).call()
    if(comment.votes && !vote.changed) comment.votes.push(vote)
    else if(!vote.changed) comment.votes = [ vote ]
  }

  const commentComments = await contract.methods.getCommentComments(commentId)
    .call()
  for(let k = 0; k < commentComments.length; k++) {
    const commentIndex = commentComments[k]
    const comments = await this.getComment(commentComments[k])
    if(comment.comments) comment.comments.push(comments)
    else comment.comments = [ comments ]
  }

  return comment
  
}

function getConsensus(obj) {
  if(obj.votes) {
    const up = obj.votes.reduce((c, v) => (v.up ? c + 1 : c), 0)
    const down = obj.votes.reduce((c, v) => (!v.up ? c + 1 : c), 0)
    return (up > 1 && down === 0) || (down > 1 && up ===0)
  } else return false
}

function aggregateConsensus(obj, a) {
  if(getConsensus(obj)) a = [...a, [obj[0], obj[1], obj[2]]]
  if(obj.comments) a = obj.comments.reduce((a, c) => aggregateConsensus(c, a), a)
  return a
}

exports.getPost = async (postId) => {
  let post = await contract.methods.posts(postId).call()
  post.consensus = getConsensus(post)
  const postVotes = await contract.methods.getPostVotes(postId).call()
  for(let j = 0; j < postVotes.length; j++) {
    const voteIndex = postVotes[j]
    const vote = await contract.methods.votes(voteIndex).call()
    if(post.votes && !vote.changed) post.votes.push(vote)
    else if(!vote.changed) post.votes = [ vote ]
  }

  const postComments = await contract.methods.getPostComments(postId).call()
  for(let j = 0; j < postComments.length; j++) {
    const comment = await this.getComment(postComments[j])
    comment.consensus = getConsensus(comment)
    if(post.comments) post.comments.push(comment)
    else post.comments = [ comment ]
  }

  post.moments = aggregateConsensus(post, [])

  return post
}

exports.getPosts = async () => {
  const c = await contract.methods.postCount().call()
  let posts = []
  for(let i = 0; i < c; i++) {
    posts.push(await contract.methods.posts(i).call())
  }

  return posts
}

exports.votePost = async (postId, up, addr) => {
  const addVote = contract.methods.addVote(postId, up)
  const gas = await addVote.estimateGas()
  console.log("addVote gas: " + gas)
  const tx = await addVote.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Vote added." : "Tx FAILED.")
  return tx.status
}

exports.commentPost = async (postId, comment, addr) => {
  const addComment = contract.methods.addComment(postId, comment)
  const gas = await addComment.estimateGas()
  console.log("addComment gas: " + gas)
  const tx = await addComment.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Comment added." : "Tx FAILED.")
  return tx.status
}

exports.voteComment = async (commentId, up, addr) => {
  const addCommentVote = contract.methods.addCommentVote(commentId, up)
  const gas = await addCommentVote.estimateGas()
  console.log("addCommentVote gas: " + gas)
  const tx = await addCommentVote.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Voted on comment." : "Tx FAILED.")
  return tx.status
}

exports.commentComment = async (commentId, comment, addr) => {
  const addCommentComment = contract.methods.addCommentComment(commentId, comment)
  const gas = await addCommentComment.estimateGas()
  console.log("addCommentComment gas: " + gas)
  const tx = await addCommentComment.send({from: addr, gas: gas})
  console.log(tx.status ? "SUCCESS: Commented on comment." : "Tx FAILED.")
  return tx.status
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

