# SPL Stake Pool

## How Yield Extraction Works

Yield extraction is delayed in this Beam. This means that a yield extraction must first be ordered,
resulting in a stake account, whose withdraw authority is a PDA derived from the beam state.

The stake account is on "cooldown", meaning it is available for withdrawal after a certain number of
epochs, typically one (2-3 days).

After this time, the stake account can be redeemed (withdrawn) to the yield account.

Yield extraction cannot happen if there is already an unredeemed stake account.

# How Rebalancing works

Similarly to yield extraction, rebalancing is delayed and in two steps.

Step 1: A rebalance order is placed, resulting in a stake account, whose withdraw authority is the same