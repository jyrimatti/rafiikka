{-# LANGUAGE ScopedTypeVariables #-}
{-# OPTIONS_GHC -Wno-orphans #-}

module Fetch (
  headJson,
  getJson,
  postJson
) where

import Universum
import Network.URI (URI, uriToString)
import Yleiset (DataType)
import Language.Javascript.JSaddle (JSM, JSString, JSVal, jsg5)
import FFI (function1)
import Data.Aeson.Types (FromJSON, Value, fromJSON, Result (Success, Error), ToJSON (toJSON))
import Data.Text (pack)
import Amcharts.DataSource (progressStart, progressEnd)
import Browser (withDebug)

headJson :: FromJSON a => DataType -> URI -> (a -> JSM ()) -> Maybe JSVal -> (Text -> JSM ()) -> JSM ()
headJson = fetchJson "HEAD" (Nothing :: Maybe ())

getJson :: FromJSON a => DataType -> URI -> (a -> JSM ()) -> Maybe JSVal -> (Text -> JSM ()) -> JSM ()
getJson = fetchJson "GET" (Nothing :: Maybe ())

postJson :: (FromJSON a, ToJSON payload) => payload -> DataType -> URI -> (a -> JSM ()) -> Maybe JSVal -> (Text -> JSM ()) -> JSM ()
postJson payload = fetchJson "POST" (Just payload)

fetchJson :: (FromJSON a, ToJSON payload) => JSString -> Maybe payload -> DataType -> URI -> (a -> JSM ()) -> Maybe JSVal -> (Text -> JSM ()) -> JSM ()
fetchJson method payload datatype uri cb signal errCb = withDebug "fetchJson" $ do
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
  void $ jsg5 method (uriToString id uri "") (function1 cb2) signal (function1 errCb2) (toJSON payload)

