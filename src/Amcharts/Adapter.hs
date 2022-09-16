{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
module Amcharts.Adapter where

import Language.Javascript.JSaddle (JSVal, FromJSVal, JSM, JSString, (!), MakeObject)
import Amcharts.Amcharts (AmchartsObject)
import Language.Javascript.JSaddle.Value (ToJSVal)
import Universum
import Amcharts.Events (cb1, cb2, cbPure1)
import Monadic (doFromJSVal)
import GHCJS.Marshal (FromJSVal(fromJSVal))

newtype Adapter = Adapter { unAdapter :: JSVal }
  deriving (Generic, ToJSVal, MakeObject)
instance FromJSVal Adapter where
  fromJSVal = pure . pure . Adapter

adapter :: AmchartsObject obj => obj -> JSM Adapter
adapter obj = Adapter <$> obj ! ("adapter" :: JSString)

addPure :: (FromJSVal a, ToJSVal b) => Adapter -> Text -> (a -> b) -> JSM ()
addPure = cbPure1 "add"

add1 :: (FromJSVal a, ToJSVal b) => Adapter -> Text -> (a -> JSM b) -> JSM ()
add1 = cb1 "add"

add2 :: (FromJSVal a1, FromJSVal a2, ToJSVal b) => Adapter -> Text -> (a1 -> a2 -> JSM b) -> JSM ()
add2 = cb2 "add"
