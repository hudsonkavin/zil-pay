<template>
  <div :class="b()">
    <Alert>
      <div
        v-if="getCurrentAccount"
        :class="b('header')"
      >
        <Title :size="SIZE_VARIANS.md">
          {{ local.SIGN_REQ }}
        </Title>
        <P nowrap>
          {{ getCurrentAccount.address | toAddress(addressFormat, true) }}
        </P>
      </div>
    </Alert>
    <div :class="b('wrapper')">
      <Icon
        v-if="getCurrent.icon"
        :src="getCurrent.icon"
        :type="ICON_TYPE.auto"
        :class="b('icon')"
        width="40"
        height="40"
      />
      <Title :size="SIZE_VARIANS.md">
        {{ getCurrent.title }}
      </Title>
      <P>
        {{ local.SIGN_DESC }}
      </P>
      <P
        :class="b('error-msg')"
        :variant="COLOR_VARIANTS.danger"
        :font="FONT_VARIANTS.regular"
        :size="SIZE_VARIANS.sm"
        centred
      >
        {{ error }}
      </P>
      <Textarea
        :class="b('msg')"
        :value="getCurrent.message"
        readonly
      />
    </div>
    <Tabs
      :elements="tabElements"
      @input="onEvent"
    />
  </div>
</template>

<script>
import { DEFAULT } from 'config'
import {
  SIZE_VARIANS,
  COLOR_VARIANTS,
  ICON_TYPE,
  FONT_VARIANTS,
  HW_VARIANTS
} from '@/config'

import { mapGetters, mapState, mapActions, mapMutations } from 'vuex'
import accountsStore from '@/store/accounts'
import settingsStore from '@/store/settings'
import uiStore from '@/store/ui'
import transactionsStore from '@/store/transactions'

import Popup from '@/pages/Popup'
import HomePage from '@/pages/Home'

import Icon from '@/components/Icon'
import Alert from '@/components/Alert'
import Title from '@/components/Title'
import P from '@/components/P'
import Textarea from '@/components/Textarea'
import Tabs from '@/components/Tabs'

import { Background, ledgerSignMessage } from '@/services'
import { toAddress } from '@/filters'

const { window } = global

export default {
  name: 'SignMessage',
  components: {
    Alert,
    Title,
    P,
    Icon,
    Tabs,
    Textarea
  },
  filters: { toAddress },
  data() {
    return {
      SIZE_VARIANS,
      COLOR_VARIANTS,
      FONT_VARIANTS,
      ICON_TYPE,

      error: null
    }
  },
  computed: {
    ...mapState(uiStore.STORE_NAME, [
      uiStore.STATE_NAMES.local
    ]),
    ...mapState(transactionsStore.STORE_NAME, [
      transactionsStore.STATE_NAMES.confirmationTx
    ]),
    ...mapState(settingsStore.STORE_NAME, [
      settingsStore.STATE_NAMES.addressFormat,
      settingsStore.STATE_NAMES.connect
    ]),
    ...mapGetters(accountsStore.STORE_NAME, [
      accountsStore.GETTERS_NAMES.getCurrentAccount
    ]),
    ...mapGetters(transactionsStore.STORE_NAME, [
      transactionsStore.GETTERS_NAMES.getCurrent
    ]),

    tabElements() {
      return [
        {
          name: this.local.CANCEL
        },
        {
          name: this.local.SIGN
        }
      ]
    }
  },
  methods: {
    ...mapActions(transactionsStore.STORE_NAME, [
      transactionsStore.ACTIONS_NAMES.setRejectedLastTx,
      transactionsStore.ACTIONS_NAMES.onUpdateToConfirmTxs
    ]),
    ...mapMutations(uiStore.STORE_NAME, [
      uiStore.MUTATIONS_NAMES.setLoad
    ]),

    async onReject() {
      this.setLoad()

      if (this.getCurrent && this.getCurrent.uuid) {
        await this.setRejectedLastTx()
      }

      await this.popupClouse()
      this.setLoad()
    },
    async onConfirm() {
      let signature = null
      let publicKey = null
      const bg = new Background()

      try {
        this.setLoad()

        const account = this.getCurrentAccount
        const { message } = this.getCurrent

        if (account.hwType && account.hwType === HW_VARIANTS.ledger) {
          signature = await ledgerSignMessage(account.index, message)
          publicKey = account.pubKey
        }

        await bg.sendForConfirmMessage({
          ...this.getCurrent,
          signature,
          publicKey
        })

        this.popupClouse()
      } catch (err) {
        this.error = err.message
      } finally {
        this.setLoad()
      }
    },
    async popupClouse() {
      await this.onUpdateToConfirmTxs()

      if (this.getCurrent && this.getCurrent.toAddr) {
        this.$router.push({ name: Popup.name })

        return null
      }

      if (this.confirmationTx.length === 0) {
        window.close()
      }
      this.$router.push({ name: HomePage.name })
    },
    onEvent(event) {
      switch (event) {
      case 1:
        this.onConfirm()
        break
      case 0:
        this.onReject()
        break
      default:
        break
      }
    }
  },
  updated() {
    if (this.getCurrent && !this.getCurrent.message) {
      this.$router.push({ name: Popup.name })
    }
  },
  mounted() {
    setTimeout(() => this.popupClouse(), DEFAULT.POPUP_CALL_TIMEOUT)
  }
}
</script>

<style lang="scss">
.SignMessage {
  display: flex;
  flex-direction: column;
  align-items: center;

  text-align: center;

  background-color: var(--app-background-color);

  &__header {
    margin: 10px;
  }

  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__icon {
    margin-top: 10%;
    margin-bottom: 10%;
  }

  &__error-msg {
    margin-bottom: 5%;
  }

  & > .Alert {
    margin-top: 30px;
  }
}
</style>
