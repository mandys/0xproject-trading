const Web3ProviderEngine = require('web3-provider-engine');
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js')
import { BigNumber } from '@0xproject/utils';
import Web3 from 'web3';
import { promisify } from '@0xproject/utils';
import { InjectedWeb3Subprovider } from '@0xproject/subproviders';
import { ZeroEx } from '0x.js';


const NETWORK_ID = 42;
//const provider = new web3.providers.HttpProvider(window.web3.currentProvider);


const providerEngine = new Web3ProviderEngine();
// Compose our Providers, order matters
// Use the InjectedWeb3Subprovider to wrap the browser extension wallet
providerEngine.addProvider(new InjectedWeb3Subprovider(window.web3.currentProvider));
// Use an RPC provider to route all other requests
//providerEngine.addProvider(new Web3.providers.HttpProvider('http://localhost:8545'));


// data source
providerEngine.addProvider(new RpcSubprovider({
  rpcUrl: 'https://kovan.infura.io/SNWrFm1CMX7BfYqvkFXf',
}))

providerEngine.start();
const web3 = new Web3(providerEngine);

console.log('providerEngine', providerEngine);
console.log('web3', web3);

const zeroEx = new ZeroEx(providerEngine, { networkId: NETWORK_ID });
console.log(zeroEx);

const DECIMALS = 18;
let signedOrder = '';
const WETH_ADDRESS = zeroEx.etherToken.getContractAddressIfExists();
console.log('WETH_ADDRESS', WETH_ADDRESS);
const ZRX_ADDRESS = zeroEx.exchange.getZRXTokenAddress();
console.log('ZRX_ADDRESS', ZRX_ADDRESS);
const EXCHANGE_ADDRESS = zeroEx.exchange.getContractAddress();
console.log('EXCHANGE_ADDRESS', EXCHANGE_ADDRESS);

const makerAddress = '0xEB1785D86087cE7Ed65C964A796aCFed00d51f25'

const takerAddress = '0x5B2B3065b36B6c7B8725F3E4de3650997C8d7e8e'


const main = async () => {
    const account = await promisify(web3.eth.getAccounts)();
    console.log(account);

}

/* Mandy is giving ZRX tokens so he gives approval to Zero Contract to manage those */
const getAllowanceFromMaker = async () => {
    console.log('inside getAllowanceFromMaker');
    const setMakerAllowTxHash = await zeroEx.token.setUnlimitedProxyAllowanceAsync(ZRX_ADDRESS, makerAddress);
    console.log('setMakerAllowTxHash', setMakerAllowTxHash);
    await zeroEx.awaitTransactionMinedAsync(setMakerAllowTxHash);
}

/* Siva is giving WETH to mandy in return, so he gives Weth contract access/approval to manage those */
const getAllowanceFromTaker = async () => {
    console.log('inside getAllowanceFromTaker');
    const setTakerAllowTxHash = await zeroEx.token.setUnlimitedProxyAllowanceAsync(WETH_ADDRESS, takerAddress);
    console.log('setTakerAllowTxHash', setTakerAllowTxHash);
    await zeroEx.awaitTransactionMinedAsync(setTakerAllowTxHash);
}


const wrapEther = async () => {
    const ethAmount = new BigNumber(0.1);
    const ethToConvert = ZeroEx.toBaseUnitAmount(ethAmount, DECIMALS); // Number of ETH to convert to WETH
    console.log('ethToCovert', ethToConvert);
    const convertEthTxHash = await zeroEx.etherToken.depositAsync(WETH_ADDRESS, ethToConvert, takerAddress);
    console.log('convertEthTxHash', convertEthTxHash);
    await zeroEx.awaitTransactionMinedAsync(convertEthTxHash);
}


const createOrder = async () => {
    const order = {
        maker: makerAddress.toLowerCase(),
        taker: ZeroEx.NULL_ADDRESS,
        feeRecipient: ZeroEx.NULL_ADDRESS,
        makerTokenAddress: ZRX_ADDRESS,
        takerTokenAddress: WETH_ADDRESS,
        exchangeContractAddress: EXCHANGE_ADDRESS,
        salt: ZeroEx.generatePseudoRandomSalt(),
        makerFee: new BigNumber(0),
        takerFee: new BigNumber(0),
        makerTokenAmount: ZeroEx.toBaseUnitAmount(new BigNumber(0.2), DECIMALS), // Base 18 decimals
        takerTokenAmount: ZeroEx.toBaseUnitAmount(new BigNumber(0.3), DECIMALS), // Base 18 decimals
        expirationUnixTimestampSec: new BigNumber(Date.now() + 3600000), // Valid for up to an hour
    };    
    const orderHash = ZeroEx.getOrderHashHex(order);
    console.log('orderHash', orderHash);
    const shouldAddPersonalMessagePrefix = true;
    let ecSignature = '';
    try {
        ecSignature = await zeroEx.signOrderHashAsync(orderHash, makerAddress.toLowerCase(), shouldAddPersonalMessagePrefix);
        console.log('ecSignature', ecSignature);
    } catch(e) {
        console.log(e);
    }
    
    // Append signature to order
    signedOrder = {
        ...order,
        ecSignature,
    };
    console.log('signedOrder', signedOrder);
    try {
        const isOrderValid = await zeroEx.exchange.validateOrderFillableOrThrowAsync(signedOrder);
        console.log('isOrderValid', isOrderValid);
    } catch(e) {
        console.log(e);
    }
}


const fillOrder = async () => {
    const shouldThrowOnInsufficientBalanceOrAllowance = true;
    const fillTakerTokenAmount = ZeroEx.toBaseUnitAmount(new BigNumber(0.1), DECIMALS);
    const txHash = await zeroEx.exchange.fillOrderAsync(
        signedOrder,
        fillTakerTokenAmount,
        shouldThrowOnInsufficientBalanceOrAllowance,
        takerAddress.toLowerCase(),
    );
    console.log('txHash', txHash);
    const txReceipt = await zeroEx.awaitTransactionMinedAsync(txHash);
    console.log('FillOrder transaction receipt: ', txReceipt);
}

main();

document.getElementById('getmaker').onclick = getAllowanceFromMaker;
document.getElementById('gettaker').onclick = getAllowanceFromTaker;
document.getElementById('wrapether').onclick = wrapEther;
document.getElementById('createorder').onclick = createOrder;
document.getElementById('fillorder').onclick = fillOrder;