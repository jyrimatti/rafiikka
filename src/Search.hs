{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE DeriveGeneric #-}
module Search where

import Universum
import Language.Javascript.JSaddle (JSM, ToJSVal (toJSVal), toJSVal_aeson)
import Amcharts.DataSource( luoDatasource, DataSource, DataType(Search) )
import URI (hakuUrlitInfra, APIResponse (APIResponse), hakuUrlitEtj2, hakuUrlitRuma)
import Types (FintrafficSystem(Infra, Jeti, Ruma), OID)
import qualified Data.Map as Map
import Data.Aeson (Value, ToJSON)

newtype Hakudata = Hakudata {
    hakudata :: [Value]
} deriving Generic
instance ToJSON Hakudata
instance ToJSVal Hakudata where
    toJSVal = toJSVal_aeson

searchInfraDS :: JSM [DataSource]
searchInfraDS = do
    urls <- hakuUrlitInfra
    traverse (\(i,u) -> luoDatasource (Search Infra i) (pure $ APIResponse u) handler) $ zip [0..] urls
  where handler = Hakudata . concat . Map.elems @OID

searchJetiDS :: JSM [DataSource]
searchJetiDS = do
    urls <- hakuUrlitEtj2
    traverse (\(i,u) -> luoDatasource (Search Jeti i) (pure $ APIResponse u) handler) $ zip [0..] urls
  where handler = Hakudata . concat . Map.elems @OID

searchRumaDS :: JSM [DataSource]
searchRumaDS = do
    let urls = hakuUrlitRuma
    traverse (\(i,u) -> luoDatasource (Search Ruma i) (pure $ APIResponse u) handler) $ zip [0..] urls
  where handler = Hakudata