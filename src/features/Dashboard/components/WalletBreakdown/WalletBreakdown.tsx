import React, { useContext, useState } from 'react';
import { Panel } from '@mycrypto/ui';
import styled from 'styled-components';

import { translateRaw } from '@translations';
import { RatesContext } from '@services';
import { SettingsContext, StoreContext } from '@services/Store';
import { StoreAsset, TUuid } from '@types';
import { weiToFloat, convertToFiatFromAsset } from '@utils';
import { BREAK_POINTS, SPACING } from '@theme';
import { getFiat } from '@config/fiats';
import { Tooltip } from '@components';

import { Balance, BalanceAccount } from './types';
import AccountDropdown from './AccountDropdown';
import BalancesDetailView from './BalancesDetailView';
import WalletBreakdownView from './WalletBreakdownView';
import NoAccountsSelected from './NoAccountsSelected';
import { isExcludedAsset } from '@services/Store/helpers';

const WalletBreakdownTop = styled.div`
  display: flex;
  flex-direction: column;

  @media (min-width: ${BREAK_POINTS.SCREEN_MD}) {
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
  }
`;

const AccountDropdownWrapper = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 480px;
  margin-bottom: ${SPACING.SM};

  @media (min-width: ${BREAK_POINTS.SCREEN_MD}) {
    margin-bottom: ${SPACING.BASE};
  }
`;

const SAccountDropdown = styled(AccountDropdown)`
  width: 100%;
  margin-left: ${SPACING.XS};
`;

const WalletBreakdownPanel = styled(Panel)`
  display: flex;
  flex-direction: column;
  margin-top: ${SPACING.XS};
  padding: 0;

  @media (min-width: ${BREAK_POINTS.SCREEN_MD}) {
    flex-direction: row;
    margin-top: 0;
  }
`;

export function WalletBreakdown() {
  const [showBalanceDetailView, setShowBalanceDetailView] = useState(false);
  const { accounts, totals, currentAccounts } = useContext(StoreContext);
  const { settings, updateSettingsAccounts } = useContext(SettingsContext);
  const { getAssetRate } = useContext(RatesContext);

  // Adds/updates an asset in array of balances, which are later displayed in the chart, balance list and in the secondary view
  const balances: Balance[] = totals(currentAccounts)
    .filter(isExcludedAsset(settings.excludedAssets))
    .map((asset: StoreAsset) => {
      const exchangeRate = getAssetRate(asset);
      return {
        id: `${asset.name}-${asset.ticker}`,
        name: asset.name || translateRaw('WALLET_BREAKDOWN_UNKNOWN'),
        ticker: asset.ticker,
        uuid: asset.uuid,
        amount: weiToFloat(asset.balance, asset.decimal),
        fiatValue: convertToFiatFromAsset(asset, exchangeRate),
        exchangeRate,
        accounts: currentAccounts.reduce((acc, currAccount) => {
          const matchingAccAssets = currAccount.assets.filter(
            (accAsset) => accAsset.uuid === asset.uuid
          );
          if (matchingAccAssets.length) {
            return [
              ...acc,
              ...matchingAccAssets.map((accAsset) => ({
                address: currAccount.address,
                ticker: accAsset.ticker,
                amount: weiToFloat(accAsset.balance, accAsset.decimal),
                fiatValue: convertToFiatFromAsset(accAsset, exchangeRate),
                label: currAccount.label
              }))
            ];
          }
          return acc;
        }, [] as BalanceAccount[])
      };
    })
    .sort((a, b) => b.fiatValue - a.fiatValue);

  const totalFiatValue = balances.reduce((sum, asset) => {
    return sum + asset.fiatValue;
  }, 0);

  const toggleShowChart = () => {
    setShowBalanceDetailView(!showBalanceDetailView);
  };

  const fiat = getFiat(settings);

  return (
    <>
      <WalletBreakdownTop>
        <AccountDropdownWrapper>
          <Tooltip tooltip={translateRaw('DASHBOARD_ACCOUNT_SELECT_TOOLTIP')} />
          <SAccountDropdown
            accounts={accounts}
            selected={settings.dashboardAccounts}
            onSubmit={(selected: TUuid[]) => {
              updateSettingsAccounts(selected);
            }}
          />
        </AccountDropdownWrapper>
      </WalletBreakdownTop>
      <WalletBreakdownPanel>
        {currentAccounts.length === 0 ? (
          <NoAccountsSelected />
        ) : showBalanceDetailView ? (
          <BalancesDetailView
            balances={balances}
            toggleShowChart={toggleShowChart}
            totalFiatValue={totalFiatValue}
            fiat={fiat}
            accounts={accounts}
            selected={settings.dashboardAccounts}
          />
        ) : (
          <WalletBreakdownView
            balances={balances}
            toggleShowChart={toggleShowChart}
            totalFiatValue={totalFiatValue}
            fiat={fiat}
            accounts={accounts}
            selected={settings.dashboardAccounts}
          />
        )}
      </WalletBreakdownPanel>
    </>
  );
}
