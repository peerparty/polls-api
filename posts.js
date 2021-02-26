const Web3 = require('web3'),
  fs = require('fs')

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
const source = fs.readFileSync("../consensus.json")
const contracts = JSON.parse(source)["contracts"]
const abi = contracts["consensus.sol:Posts"].abi

// make a call to a contract
async function exec(addr, pass, contractAddr, call, desc) {
  //let gas = await call.estimateGas({from: addr}) * 10
  //let atx = call.send({from: addr, gas: gas})
  //console.log(`sent ${call._method.name} with gas ${gas}`)

  //let result = await atx
  //console.log(desc, result.status ? `SUCCESS` : "FAIL")

//const keystore = fs.readFileSync("UTC--...", 'utf8');
//const decryptedAccount = 
//web3.eth.accounts.decrypt(JSON.parse(keystore), password);

  web3.eth.personal.unlockAccount(addr, pass)
  let nonce = await web3.eth.getTransactionCount(addr)
  let encodedABI = call.encodeABI()
  let gas = await call.estimateGas({ from: addr })
  let gasPrice = await web3.eth.getGasPrice()
  console.log('GAS', gas, gasPrice)
  let obj = {
    from: addr,
    to: contractAddr,
    gas: gas,
    gasPrice: gasPrice,
    data: encodedABI,
    nonce: nonce,
    value: ""
  }
  let res = await web3.eth.signTransaction(obj, addr)
  let txn = await web3.eth.sendSignedTransaction(res.raw || res.rawTransaction)
  console.log(txn)
  //txn.on('transactionHash', hash => { console.log(`Txn Hash: ${hash}`) })
}

exports.getBalance = async addr => {
  let b = await web3.eth.getBalance(addr)
  return web3.utils.fromWei(`${b}`, 'ether')
}

exports.addPost = async (title, description, addr, pass, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  return await exec(
    addr,
    pass,
    contractAddr,
    contract.methods.addPost(title, description),
    "Post added")
}

exports.countPosts = async (addr, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  const c = await contract.methods.postCount().call({ from: addr })
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
    const comments = await getComment(commentComments[k], addr, contractAddr)
    if(comment.comments) comment.comments.push(comments)
    else comment.comments = [ comments ]
  }

  return comment
}

exports.getComment = async (commentId) => {
  return await getComment(commentId)
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
  console.log("getPost", postId, addr, contractAddr)
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
  return await getPost(postId, addr, contractAddr)
}

exports.getPosts = async (addr, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  const c = await contract.methods.postCount().call({from: addr})
  let posts = []
  for(let i = 0; i < c; i++) {
    posts.push(await getPost(i, addr, contractAddr))
  }

  return posts
}

exports.votePost = async (postId, up, addr, pass, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  return await exec(
    addr,
    pass,
    contractAddr,
    contract.methods.addVote(postId, up),
    "Vote added")
}

exports.commentPost = async (postId, comment, addr, pass, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  return await exec(
    addr,
    pass,
    contractAddr,
    contract.methods.addComment(postId, comment),
    "Comment added")
}

exports.voteComment = async (commentId, up, addr, pass, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  return await exec(
    addr,
    pass,
    contractAddr,
    contract.methods.addCommentVote(commentId, up),
    "Voted on comment")
}

exports.commentComment = async (commentId, comment, addr, pass, contractAddr) => {
  const contract = new web3.eth.Contract(abi, contractAddr)
  return await exec(
    addr,
    pass,
    contractAddr,
    contract.methods.addCommentComment(commentId, comment),
    "Commented on comment")
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


