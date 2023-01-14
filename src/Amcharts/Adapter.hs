{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE ScopedTypeVariables, OverloadedStrings #-}

module Amcharts.Adapter where

import Amcharts.Amcharts (AmchartsObject)
import Amcharts.Events (cb1, cb2, cbPure1)
import GHCJS.Marshal (FromJSVal (fromJSVal))
import Language.Javascript.JSaddle (JSM, JSVal, MakeObject, (!))
import Language.Javascript.JSaddle.Value (ToJSVal)
import Universum

newtype Adapter = Adapter {unAdapter :: JSVal}
  deriving (Generic, ToJSVal, MakeObject)

instance FromJSVal Adapter where
  fromJSVal = pure . pure . Adapter

adapter :: AmchartsObject obj => obj -> JSM Adapter
adapter obj = Adapter <$> obj ! ("adapter" :: Text)

addPure :: (FromJSVal a, ToJSVal b) => Adapter -> Text -> (a -> b) -> JSM ()
addPure = cbPure1 "add"

add1 :: (FromJSVal a, ToJSVal b) => Adapter -> Text -> (a -> JSM b) -> JSM ()
add1 = cb1 "add"

add2 :: (FromJSVal a1, FromJSVal a2, ToJSVal b) => Adapter -> Text -> (a1 -> a2 -> JSM b) -> JSM ()
add2 = cb2 "add"
