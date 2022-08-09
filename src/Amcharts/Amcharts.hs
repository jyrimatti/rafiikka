{-# LANGUAGE PolyKinds #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE RankNTypes #-}
module Amcharts.Amcharts where

import Language.Javascript.JSaddle (MakeObject, ToJSVal)

class (MakeObject a, ToJSVal a) => AmchartsObject a

type family HasEvent obj ev
