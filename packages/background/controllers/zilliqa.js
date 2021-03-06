/*
 * Project: ZilPay-wallet
 * Author: Rinat(lich666dead)
 * -----
 * Modified By: the developer formerly known as Rinat(lich666dead) at <lich666black@gmail.com>
 * -----
 * Copyright (c) 2019 ZilPay
 */
import { FIELDS, DEFAULT_TOKEN } from 'config'
import { BrowserStorage, BuildObject } from 'lib/storage'
import { TypeChecker } from 'lib/type'
import { accountControl, networkControl } from './main'
import { ZilliqaControl } from 'packages/background/services'
import { ERROR_MSGS } from 'packages/background/errors'

const { Promise } = global

export class Zilliqa {

  /**
   * Call when inpage script has been loaded.
   * @param {Function} sendResponse - CallBack funtion for return response to sender.
   * @param {String} domain - Tab domain name.
   */
  static async initInpage(sendResponse, domain) {
    await networkControl.netwrokSync()

    const storage = new BrowserStorage()
    const provider = networkControl.provider
    const isConnect = await accountControl.isConnection(domain)
    let wallet = await storage.get(FIELDS.WALLET)
    let account = null

    if (wallet && new TypeChecker(wallet.identities).isArray && isConnect) {
      account = wallet.identities[
        wallet.selectedAddress
      ]
    }

    const data = {
      provider,
      account,
      isConnect,
      isEnable: accountControl.auth.isEnable,
      net: networkControl.selected
    }

    sendResponse(data)
  }

  /**
   * Clear stored tx.
   * @param {Function} sendResponse - CallBack funtion for return response to sender.
   */
  static async rmAllTransactionList(sendResponse) {
    await accountControl.zilliqa.rmAllTransactionList()

    if (new TypeChecker(sendResponse).isFunction) {
      sendResponse(true)
    }
  }

  constructor(payload) {
    this.payload = payload
  }

  /**
   * Get some ZRC token informations.
   * @param {Function} sendResponse - CallBack funtion for return response to sender.
   */
  async getZRCTokenInfo(sendResponse) {
    await networkControl.netwrokSync()

    const storage = new BrowserStorage()
    const wallet = await storage.get(FIELDS.WALLET)
    const { address } = this.payload
    const account = wallet.identities[
      wallet.selectedAddress
    ]
    const zilliqa = new ZilliqaControl(networkControl.provider)

    // Trting to get full token information.
    try {
      let result = await zilliqa.getSmartContractInit(address)

      if (result.proxy_address) {
        // If token is Mintable type need to get the operator.
        result = await zilliqa.getSmartContractInit(result.proxy_address)
      }

      // Getting total supply of token.
      const { total_supply } = await zilliqa.getSmartContractSubState(
        result._this_address, 'total_supply'
      )
      // Getting balance of token for current selected account.
      const balance = await zilliqa.getZRCBalance(result._this_address, account)
      const token = {
        address: result._this_address,
        balance: balance,
        owner: result.contract_owner,
        decimals: result.decimals,
        name: result.name,
        symbol: result.symbol,
        totalSupply: total_supply
      }

      if (new TypeChecker(sendResponse).isFunction) {
        sendResponse({ resolve: token })
      }

      return Promise.resolve(token)
    } catch (err) {
      if (new TypeChecker(sendResponse).isFunction) {
        sendResponse({ reject: ERROR_MSGS.BAD_CONTRACT_ADDRESS })
      }

      return Promise.reject(err)
    }
  }

  /**
   * Add to storage tokens info.
   * @param {Function} sendResponse - CallBack funtion for return response to sender.
   */
  async addZRCToken(sendResponse) {
    await networkControl.netwrokSync()
    const storage = new BrowserStorage()
    const tokens = await storage.get([
      FIELDS.TOKENS,
      FIELDS.SELECTED_COIN
    ])
    const zrcToken = await this.getZRCTokenInfo()
    const selectedNet = networkControl.selected

    if (!tokens || !tokens[FIELDS.TOKENS]) {
      const keys = Object.keys(networkControl.config)
      tokens[FIELDS.TOKENS] = {
        [keys[0]]: [],
        [keys[1]]: [],
        [keys[2]]: []
      }
    }

    const hasToken = tokens[FIELDS.TOKENS][selectedNet].some(
      (t) => t.symbol === zrcToken.symbol
    )

    if (hasToken) {
      if (new TypeChecker(sendResponse).isFunction) {
        sendResponse({ reject: ERROR_MSGS.UNIQUE })
      }

      return Promise.reject(new Error(ERROR_MSGS.UNIQUE))
    }

    tokens[FIELDS.SELECTED_COIN] = zrcToken.symbol
    tokens[FIELDS.TOKENS][selectedNet].push(zrcToken)

    await storage.set([
      new BuildObject(FIELDS.TOKENS, tokens[FIELDS.TOKENS]),
      new BuildObject(FIELDS.SELECTED_COIN, tokens[FIELDS.SELECTED_COIN])
    ])

    if (new TypeChecker(sendResponse).isFunction) {
      sendResponse({ resolve: tokens })
    }
  }

  /**
   * Reset or create token tracker in storage.
   * @param {Function} sendResponse - CallBack funtion for return response to sender.
   */
  async toDefaulTokens(sendResponse) {
    const data = await accountControl.initCoin()

    if (new TypeChecker(sendResponse).isFunction) {
      sendResponse({ resolve: data })
    }

    return data
  }

  /**
   * Remove token by symbol.
   * @param {Function} sendResponse - CallBack funtion for return response to sender.
   */
  async rmZRCToken(sendResponse) {
    const { symbol } = this.payload
    const storage = new BrowserStorage()
    const tokens = await storage.get(FIELDS.TOKENS)
    const selectedNet = networkControl.selected

    if (symbol === DEFAULT_TOKEN.symbol) {
      sendResponse({
        resolve: {
          tokens,
          selectedcoin: DEFAULT_TOKEN.symbol
        }
      })
    }

    tokens[selectedNet] = tokens[selectedNet].filter((t) => t.symbol !== symbol)

    await storage.set([
      new BuildObject(FIELDS.TOKENS, tokens),
      new BuildObject(FIELDS.SELECTED_COIN, DEFAULT_TOKEN.symbol)
    ])

    sendResponse({
      resolve: {
        tokens: tokens,
        selectedcoin: DEFAULT_TOKEN.symbol
      }
    })
  }

  /**
   * Getting minimum gasPrice from blockchain.
   * @param {*} sendResponse - CallBack funtion for return response to sender.
   */
  async getMinGasPrice(sendResponse) {
    try {
      await networkControl.netwrokSync()

      const zilliqa = new ZilliqaControl(networkControl.provider)
      const { result, error } = await zilliqa.blockchain.getMinimumGasPrice()

      if (error) {
        throw new Error(error.message)
      }

      if (new TypeChecker(sendResponse).isFunction) {
        sendResponse({ resolve: result })
      }
    } catch (err) {
      if (new TypeChecker(sendResponse).isFunction) {
        sendResponse({ reject: err.message })
      }
    }
  }

}
