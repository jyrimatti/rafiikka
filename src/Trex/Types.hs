{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE MultiParamTypeClasses #-}

module Trex.Types where

import Universum
import Language.Javascript.JSaddle (FromJSVal(fromJSVal), ToJSVal (toJSVal))
import Monadic (doFromJSVal)
import Yleiset ()



data TrexType = 
      Silta
    | Tunneli
  deriving (Show, Enum, Bounded, Read)

instance ToJSVal TrexType where
    toJSVal = toJSVal . trexType

instance FromJSVal TrexType where
  fromJSVal = doFromJSVal "TrexType" $ \x -> do
    nat <- MaybeT $ fromJSVal x
    hoistMaybe $ findTrexType nat

trexType :: TrexType -> Natural
trexType Silta   = 15
trexType Tunneli = 17

trexTypes :: [TrexType]
trexTypes = [minBound ..]

findTrexType :: Natural -> Maybe TrexType
findTrexType x = find ((== x) . trexType) trexTypes