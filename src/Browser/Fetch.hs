{-# LANGUAGE ScopedTypeVariables #-}
{-# OPTIONS_GHC -Wno-orphans #-}

module Browser.Fetch (
  headJson,
  getJson,
  postJson
) where

import Universum
import Text.URI (URI, render)
import Language.Javascript.JSaddle (JSM, JSString, JSVal, jsg5)
import FFI (function1)
import Data.Aeson.Types (FromJSON, Value, fromJSON, Result (Success, Error), ToJSON (toJSON))
import Data.Text (pack)
import Amcharts.DataSource (progressStart, progressEnd, DataType)
import Browser.Browser (withDebug)

headJson :: FromJSON a => DataType -> URI -> Maybe JSVal -> (Text -> JSM ()) -> (a -> JSM ()) -> JSM ()
headJson = fetchJson "HEAD" (Nothing :: Maybe ())

getJson :: FromJSON a => DataType -> URI -> Maybe JSVal -> (Text -> JSM ()) -> (a -> JSM ()) -> JSM ()
getJson = fetchJson "GET" (Nothing :: Maybe ())

postJson :: (FromJSON a, ToJSON payload) => payload -> DataType -> URI -> Maybe JSVal -> (Text -> JSM ()) -> (a -> JSM ()) -> JSM ()
postJson payload = fetchJson "POST" (Just payload)

fetchJson :: (FromJSON a, ToJSON payload) => JSString -> Maybe payload -> DataType -> URI -> Maybe JSVal -> (Text -> JSM ()) -> (a -> JSM ()) -> JSM ()
fetchJson method payload datatype uri signal errCb cb = withDebug "fetchJson" $ do
  let cb2 :: Value -> JSM ()
      cb2 value = do
        case fromJSON value of
          Success a -> do
            progressEnd datatype
            cb a
          Error str -> do
            progressEnd datatype
            errCb (pack str)
      errCb2 :: Text -> JSM ()
      errCb2 msg = do
        progressEnd datatype
        errCb msg

  progressStart datatype
  void $ jsg5 method (render uri) signal (function1 errCb2) (function1 cb2) (toJSON payload)

