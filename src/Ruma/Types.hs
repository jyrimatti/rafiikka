{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE MultiParamTypeClasses #-}

module Ruma.Types where

import Universum
import Language.Javascript.JSaddle (FromJSVal(fromJSVal), ToJSVal (toJSVal))
import Monadic (doFromJSVal)
import Yleiset ()



data RumaType = 
      Ratatyoilmoitus
    | Liikenteenrajoite
  deriving (Show, Enum, Bounded, Eq, Read)

instance ToJSVal RumaType where
    toJSVal = toJSVal . rumaType

instance FromJSVal RumaType where
  fromJSVal = doFromJSVal "RumaType" $ \x -> do
    nat <- MaybeT $ fromJSVal x
    hoistMaybe $ findRumaType nat

rumaType :: RumaType -> Natural
rumaType Ratatyoilmoitus = 1
rumaType Liikenteenrajoite = 2

rumaShortName :: RumaType -> Text
rumaShortName Ratatyoilmoitus   = "RT"
rumaShortName Liikenteenrajoite = "LR"

rumaTypes :: [RumaType]
rumaTypes = [minBound ..]

findRumaType :: Natural -> Maybe RumaType
findRumaType x = find ((== x) . rumaType) rumaTypes

findRumaTypeByShortName :: Text -> Maybe RumaType
findRumaTypeByShortName x = find ((== x) . rumaShortName) rumaTypes



data RTTila = RTActive | RTPassive | RTSent | RTFinished
    deriving Show

instance FromJSVal RTTila where
    fromJSVal = doFromJSVal "RTTila" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        case xx of
            "ACTIVE"   -> pure RTActive
            "PASSIVE"  -> pure RTPassive
            "SENT"     -> pure RTSent
            "FINISHED" -> pure RTFinished
            _            -> mzero

