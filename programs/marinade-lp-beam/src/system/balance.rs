use anchor_lang::prelude::*;
use marinade_common::{calc_lamports_from_msol_amount, proportional};
use marinade_cpi::State as MarinadeState;

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub struct LiquidityPoolBalance {
    pub lamports: i128,
    pub msol: i128,
    pub liq_pool_token: i128,
}
impl LiquidityPoolBalance {
    pub fn new(sol_leg: i128, msol_leg: i128, total_liq_pool_tokens: i128) -> Self {
        LiquidityPoolBalance {
            lamports: sol_leg,
            msol: msol_leg,
            liq_pool_token: total_liq_pool_tokens,
        }
    }

    pub fn value_of(&self, liq_pool_token: u64) -> Result<Self> {
        let lamports = proportional(self.lamports, liq_pool_token as i128, self.liq_pool_token);
        let msol = proportional(self.msol, liq_pool_token as i128, self.liq_pool_token);
        Ok(LiquidityPoolBalance {
            lamports,
            msol,
            liq_pool_token: liq_pool_token as i128,
        })
    }

    // The value of both legs of the liquidity pool balance in SOL
    pub fn sol_value(&self, marinade_state: &MarinadeState) -> u64 {
        let lamports = self.lamports;
        let msol = calc_lamports_from_msol_amount(marinade_state, self.msol as u64);
        lamports.checked_add(msol as i128).expect("sol_value") as u64
    }

    // if this balance in lamports is smaller than other_lamports, return this,
    // otherwise return a liquidity pool balance with lamports = other_lamports
    // and liq_pool_token = the amount of liq_pool_token that would be needed to withdraw
    // other_lamports from the liquidity pool
    pub fn min_lamports(&self, other_lamports: i128) -> Self {
        if self.lamports < other_lamports {
            return *self;
        }
        let other_liq_pool_token = proportional(self.liq_pool_token, other_lamports, self.lamports);
        let other_msol = proportional(self.msol, other_lamports, self.lamports);
        Self {
            lamports: other_lamports,
            msol: other_msol,
            liq_pool_token: other_liq_pool_token,
        }
    }

    // returns a new balance that is the result of subtracting other_lamports from this balance
    pub fn checked_sub_lamports(&self, other_lamports: i128) -> Result<Self> {
        let new_lamports = self
            .lamports
            .checked_sub(other_lamports)
            .expect("checked_sub_lamports");
        let new_liq_pool_token = proportional(self.liq_pool_token, new_lamports, self.lamports);

        let new_msol = proportional(self.msol, new_lamports, self.lamports);
        Ok(Self {
            lamports: new_lamports,
            msol: new_msol,
            liq_pool_token: new_liq_pool_token,
        })
    }

    pub fn sub(&self, other: Self) -> Self {
        let new_lamports = self.lamports.saturating_sub(other.lamports);
        let new_liq_pool_token = self.liq_pool_token.saturating_sub(other.liq_pool_token);
        let new_msol = self.msol.saturating_sub(other.msol);
        Self {
            lamports: new_lamports,
            msol: new_msol,
            liq_pool_token: new_liq_pool_token,
        }
    }
}
