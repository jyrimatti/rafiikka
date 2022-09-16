{-# LANGUAGE PolyKinds #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE RankNTypes #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE DeriveGeneric #-}
module Amcharts.Amcharts where

import Language.Javascript.JSaddle (MakeObject, ToJSVal, JSVal, JSM, JSString, jsg)
import Control.Applicative ( (<$>) )
import GHC.Generics

class (MakeObject a, ToJSVal a) => AmchartsObject a

type family HasEvent obj ev

newtype Am4Core = AmCore JSVal
  deriving (MakeObject, Generic, ToJSVal)

am4core :: JSM Am4Core
am4core = AmCore <$> jsg @JSString "am4core"
