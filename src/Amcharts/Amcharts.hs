{-# LANGUAGE DeriveGeneric, GeneralizedNewtypeDeriving, RankNTypes, DataKinds, PolyKinds, TypeFamilies #-}
module Amcharts.Amcharts where

import Language.Javascript.JSaddle (MakeObject, ToJSVal, JSVal, JSM, jsg)
import Control.Applicative ( (<$>) )
import GHC.Generics

class (MakeObject a, ToJSVal a) => AmchartsObject a

type family HasEvent obj ev

newtype Am4Core = AmCore JSVal
  deriving (MakeObject, Generic, ToJSVal)

am4core :: JSM Am4Core
am4core = AmCore <$> jsg "am4core"
