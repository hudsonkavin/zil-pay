import storage from './storage'

import { Zilliqa } from '@zilliqa-js/zilliqa'
// import {
//   getAddressFromPrivateKey,
//   getPubKeyFromPrivateKey
// } from '@zilliqa-js/crypto'
import { units, Long, BN, bytes } from '@zilliqa-js/util'

import Mnemonic from '../lib/mnemonic'
import zilConf from '../config/zil'


export default {
  namespaced: true,

  state: {
    zilliqa: new Zilliqa(zilConf.testnet.PROVIDER),
    mnemonic: new Mnemonic()
  },
  mutations: {
    changeProvider(state, key) {
      state.zilliqa = new Zilliqa(zilConf[key].PROVIDER);
    }
  },
  actions: {
    async balanceUpdate({ state, getters }) {
      console.log(state.zilliqa);
      let storageState = getters.STORAGE_STATE;
      let storageMutations = getters.STORAGE_MUTATIONS;
      let data = storageState.wallet;
      let addressIndex = storageState.wallet.selectedAddress;
      let { address } = storageState.wallet.identities[addressIndex];
      let { result } = await state.zilliqa.blockchain.getBalance(address);

      if (!result) {
        result = 0;
      } else {
        result = result.balance;
      }

      data.identities[addressIndex].balance = result;

      storageMutations.wallet(storageState, data);

      return result;
    },

    async buildTransaction({ state, getters }, { to, amount, gasPrice }) {
      let storageState = getters.STORAGE_STATE;
      let storageMutations = getters.STORAGE_MUTATIONS;
      let addressIndex = storageState.wallet.selectedAddress;
      let { CHAIN_ID, MSG_VERSION } = storageState.config[storageState.selectedNet];
      let { address, publicKey } = storageState.wallet.identities[addressIndex];
      let { result } = await state.zilliqa.blockchain.getBalance(address);

      if (!state.mnemonic._bip39) {
        state.mnemonic.bip32Node(storageState.bip39);
      }

      let nonce = result ? result.nonce : 0;
      let gasLimit = Long.fromNumber(1);
      let version = bytes.pack(CHAIN_ID, MSG_VERSION);
      let { privateKey } = state.mnemonic.getPrivateKeyAtIndex(addressIndex);

      gasPrice = units.toQa(gasPrice, units.Units.Zil);
      amount = new BN(units.toQa(amount, units.Units.Zil));
      nonce++;

      state.zilliqa.wallet.addByPrivateKey(privateKey);

      let zilTxData = state.zilliqa.transactions.new({
        version, nonce, gasPrice, amount, gasLimit,
        toAddr: to, pubKey: publicKey,
      });

      let tx = await state.zilliqa.blockchain.createTransaction(zilTxData);

      tx.amount = amount.toString();

      storageMutations.transactions(storageState, { tx, address });

      return tx;
    }
  },
  getters: {
    STORAGE_STATE() {
      return storage.state;
    },
    STORAGE_MUTATIONS() {
      return storage.mutations;
    },
  }
}