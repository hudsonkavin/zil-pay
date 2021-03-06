<template>
  <div
    v-if="getCurrentAccount"
    :class="b()"
  >
    <BackModal
      v-if="local.RECEIVE"
      :name="local.RECEIVE"
      :back="accountModal.step > 0"
      @click="onStep"
    />
    <div :class="b('wrapper')">
      <Title
        :class="b('name')"
        :value="getAccountName(getCurrentAccount)"
        :variant="COLOR_VARIANTS.primary"
        :size="SIZE_VARIANS.md"
        changeable
        @input="setAccountName"
      >
        {{ getAccountName(getCurrentAccount) }}
      </Title>
      <Icon
        v-if="qrcode"
        :src="qrcode"
        :type="ICON_TYPE.auto"
        height="200"
        width="200"
      />
      <input
        :class="b('copy')"
        :value="getCurrentAccount.address | toAddress(addressFormat, false)"
        readonly
      >
      <ViewblockLink :address="getCurrentAccount.address" />
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode'

import { mapMutations, mapState, mapGetters } from 'vuex'
import settingsStore from '@/store/settings'
import uiStore from '@/store/ui'
import modalStore from '@/store/modal'
import accountsStore from '@/store/accounts'

import {
  COLOR_VARIANTS,
  SIZE_VARIANS,
  ICON_VARIANTS,
  ICON_TYPE
} from '@/config'

import Title from '@/components/Title'
import Icon from '@/components/Icon'
import BackModal from '@/components/BackModal'
import ViewblockLink from '@/components/ViewblockLink'

import AccountMixin from '@/mixins/account'
import CopyMixin from '@/mixins/copy'
import { toAddress } from '@/filters'

export default {
  name: 'Account',
  mixins: [AccountMixin, CopyMixin],
  filters: { toAddress },
  components: {
    Title,
    Icon,
    BackModal,
    ViewblockLink
  },
  data() {
    return {
      COLOR_VARIANTS,
      SIZE_VARIANS,
      ICON_TYPE,
      ICON_VARIANTS,

      qrcode: null
    }
  },
  computed: {
    ...mapState(uiStore.STORE_NAME, [
      uiStore.STATE_NAMES.local
    ]),
    ...mapState(settingsStore.STORE_NAME, [
      settingsStore.STATE_NAMES.addressFormat
    ]),
    ...mapState(modalStore.STORE_NAME, [
      modalStore.STATE_NAMES.accountModal
    ]),
    ...mapGetters(accountsStore.STORE_NAME, [
      accountsStore.GETTERS_NAMES.getCurrentAccount
    ])
  },
  methods: {
    ...mapMutations(accountsStore.STORE_NAME, [
      accountsStore.MUTATIONS_NAMES.setAccountName
    ]),
    ...mapMutations(modalStore.STORE_NAME, [
      modalStore.MUTATIONS_NAMES.setShowAccountModal
    ]),

    onStep() {
      if (this.accountModal.step === 0) {
        this.setShowAccountModal()
      }
    },
    async qrcodeGenerate() {
      if (!this.getCurrentAccount || !this.getCurrentAccount.address) {
        return null
      }

      const address = toAddress(
        this.getCurrentAccount.address,
        this.addressFormat,
        false
      )
      this.qrcode = await QRCode.toDataURL(
        `zilliqa://${address}`
      )
    }
  },
  beforeUpdate() {
    this.qrcodeGenerate()
  }
}
</script>

<style lang="scss">
.Account {
  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;

    min-height: 350px;

    & > .Button {
      display: flex;
      align-items: center;
      justify-content: space-evenly;

      min-width: 150px;

      & > img {
        height: 30px;
        width: auto;
      }
    }
  }

  &__name > * {
    text-align: center;
  }

  &__copy {
    width: 200px;
    padding: 5px;
    border: 0;

    border-radius: var(--default-border-radius);
    background: transparent;
    color: var(--accent-color-gray);
    border: 1px solid var(--accent-color-gray);
  }
}
</style>
