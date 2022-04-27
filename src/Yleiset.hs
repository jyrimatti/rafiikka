{-# LANGUAGE ScopedTypeVariables #-}
{-# OPTIONS_GHC -Wno-orphans #-}
{-# LANGUAGE TypeApplications #-}

module Yleiset where

import Universum hiding (get)
import Data.Time (UTCTime)
import Data.Time.Calendar.MonthDay ()
import Data.Time.Calendar.OrdinalDate ()
import Time (Interval (Interval))
import Control.Lens ((+~), (-~))
import Data.Time.Lens (months, FlexibleDateTime (flexDT))
import Data.List.NonEmpty (fromList)
import Data.JSString (JSString)
import Language.Javascript.JSaddle (JSVal, JSM, (!), jsg, new, jsg3, FromJSVal, ToJSVal)
import Text.URI (URI, mkURI, render)
import GHCJS.Marshal (FromJSVal(fromJSVal))
import Monadic (doFromJSVal)
import Language.Javascript.JSaddle.Classes (ToJSVal(toJSVal))

data DataType = Other | Infra
  deriving Show

instance FromJSVal DataType where
  fromJSVal _ = pure $ Just Other
  -- FIXME

instance FromJSVal Natural where
  fromJSVal = doFromJSVal "Natural" $ \x -> do
    MaybeT $ fromJSVal x

instance ToJSVal Natural where
  toJSVal = toJSVal @Int . fromIntegral

instance FromJSVal URI where
  fromJSVal = doFromJSVal "URI" $ \x -> do
    str <- MaybeT $ fromJSVal x
    hoistMaybe $ mkURI str

instance ToJSVal URI where
  toJSVal = toJSVal . render

expandInterval :: Interval -> Interval
expandInterval (Interval start end) = Interval ((flexDT.months -~ 1) start)
                                               ((flexDT.months +~ 1) end)

laajennaAikavali_ :: NonEmpty UTCTime -> NonEmpty UTCTime
laajennaAikavali_ xs = case toList xs of
  [start, end] ->
    let
      (Interval a3 b3) = expandInterval $ Interval start end
    in fromList [a3, b3]
  _ -> xs

errorHandler :: JSVal -> JSM ()
errorHandler err = do
  errorStack <- err ! ("stack" :: JSString)
  stack <- new (jsg @JSString "Error") () ! ("stack" :: JSString)
  _ <- jsg3 @JSString "log" err errorStack stack
  pure ()
